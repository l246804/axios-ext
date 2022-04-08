import { AxiosExtPlugin, AxiosExtInstance, ChainShallowAxiosInstance } from '@iel/axios-ext'
import {
  isFunction,
  assignSafely,
  isBoolean,
  isString,
  isNullish,
  bind,
  Nullish,
  isSafeInteger,
  noop,
  deleteKeys,
  helperCreateEventStoreManager
} from '@iel/axios-ext-utils'
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import localforage from 'localforage'

declare module 'axios' {
  interface AxiosInstance {
    Cache: ReturnType<typeof useStoreManager>
    withCache: <T extends ChainShallowAxiosInstance = any>(
      this: T,
      args?: AxiosExtCacheArgs
    ) => Omit<T, 'withCache' | 'Cache'>
  }
}

export type AxiosExtCacheOptions = {
  storeName?: string | number
  configStore?: (store: LocalForage) => void
  keyGenerator?: (config: AxiosRequestConfig, args: AxiosExtCacheArgs) => AxiosExtCacheEntity['key']
  isExpired?: (entity: AxiosExtCacheEntity, args: AxiosExtCacheArgs) => boolean
  allowCache?: (response: AxiosResponse, args: AxiosExtCacheArgs) => boolean
  transformData?: (response: AxiosResponse, args: AxiosExtCacheArgs) => any
  onError?: (error: any) => void
  [K: string]: any
}

export type AxiosExtCacheArgs = {
  key?: AxiosExtCacheEntity['key']
  expire?: AxiosExtCacheEntity['expire']
  forceUpdate?: boolean
  [K: string]: any
}

export type AxiosExtCacheEntity<T = any> = {
  key: string
  now: number
  expire: number | null
  data: T
}

const defaultStoreOptions = (): LocalForageOptions => ({
  name: 'AXIOS_EXT_CACHE_DB',
  storeName: 'AXIOS_EXT_CACHE_SOTRE',
  description: 'Cache data of axios.'
})

const defaultArgs = (): Required<AxiosExtCacheArgs> => ({
  key: '',
  expire: null,
  forceUpdate: false
})

const useStore = (baseOptions: AxiosExtCacheOptions) => {
  const storeOptions = defaultStoreOptions()
  if (!isNullish(baseOptions.storeName)) {
    storeOptions.storeName += `__${baseOptions.storeName}`
  }

  const store = localforage.createInstance(storeOptions)
  if (typeof baseOptions.configStore === 'function') {
    baseOptions.configStore(store)
  }

  return store
}

const useStoreManager = (store: ReturnType<typeof useStore>, axiosExt: AxiosExtInstance) => {
  const get = async (configOrKey: AxiosExtCacheEntity['key'] | AxiosRequestConfig) => {
    const key = isString(configOrKey) ? configOrKey : axiosExt.getKeyByConfig(configOrKey)

    return store.getItem<AxiosExtCacheEntity>(key)
  }

  const set = async (entity: AxiosExtCacheEntity) => {
    if (!entity?.key) return

    return store.setItem(entity.key, entity)
  }

  const remove = async (configOrKey: AxiosExtCacheEntity['key'] | AxiosRequestConfig) => {
    const key = isString(configOrKey) ? configOrKey : axiosExt.getKeyByConfig(configOrKey)

    return store.removeItem(key)
  }

  const removeBy = async (
    predicate: (entity: AxiosExtCacheEntity, key: AxiosExtCacheEntity['key'], interrupter: () => void) => boolean
  ) => {
    let needsDeleteEntities: AxiosExtCacheEntity['key'][] = []

    let isInterrupted = false

    const interrupter = () => (isInterrupted = true)

    return store
      .iterate<AxiosExtCacheEntity, any>((entity, key) => {
        const valid = predicate?.(entity, key, interrupter) ?? false

        valid && needsDeleteEntities.push(entity.key)

        // interrupt iterate
        if (isInterrupted) {
          needsDeleteEntities = [entity.key]

          return true
        }
      })
      .then(() => Promise.all(needsDeleteEntities.map((key) => remove(key))))
  }

  const clear = async () => {
    return store.clear()
  }

  const destroy = () => {
    clear()
    store.dropInstance()
  }

  return {
    get,
    set,
    remove,
    removeBy,
    clear,
    destroy
  }
}

const getNow = () => Date.now()

const defaultIsExpired = (entity: AxiosExtCacheEntity) => {
  const expireTime = isSafeInteger(entity.expire) ? entity.expire : Infinity
  return getNow() - entity.now >= expireTime!
}

const defaultTransformData = (response: AxiosResponse) => {
  // Raw response data will cause storage failure.
  return response.data
}

const getValidOptions = (options: AxiosExtCacheOptions = {}) => {
  const _options: AxiosExtCacheOptions = assignSafely(options)
  if (!isFunction(_options.allowCache)) _options.allowCache = undefined
  if (!isFunction(_options.configStore)) _options.configStore = undefined
  if (!isFunction(_options.isExpired)) _options.isExpired = defaultIsExpired
  if (!isFunction(_options.keyGenerator)) _options.keyGenerator = undefined
  if (!isFunction(_options.onError)) _options.onError = noop
  if (!isFunction(_options.transformData)) _options.transformData = defaultTransformData

  return _options
}

const getValidArgs = (args: AxiosExtCacheArgs = {}) => {
  const _args: Required<AxiosExtCacheArgs> = assignSafely(defaultArgs(), args)
  if (!isBoolean(_args.forceUpdate)) _args.forceUpdate = !!_args.forceUpdate
  if (!isString(_args.key) && !isNullish(_args.key)) _args.key = String(_args.key)

  return _args
}

const useAxiosExtCache: AxiosExtPlugin<AxiosExtCacheOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const store = useStore(baseOptions)
  const storeManager = useStoreManager(store, axiosExt)
  const evtStoreManager = helperCreateEventStoreManager<Required<AxiosExtCacheArgs>>('Cache')
  const instance = axiosExt.instance

  const withCache: AxiosInstance['withCache'] = function (args) {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)
    evtStoreManager.set(shallowInstance.$eventStore, getValidArgs(args))
    deleteKeys(shallowInstance, ['withCache', 'Cache'])

    return shallowInstance as any
  }

  const validateCache = async (args: Required<AxiosExtCacheArgs>) => {
    let entity: AxiosExtCacheEntity | Nullish = null
    try {
      entity = await storeManager.get(args.key)
    } catch (error) {
      baseOptions.onError!(error)
    }
    if (!entity) return false

    const expired = baseOptions.isExpired!(entity, args)
    if (args.forceUpdate || expired) {
      try {
        await storeManager.remove(args.key)
      } catch (error) {
        baseOptions.onError!(error)
      }
      return false
    }

    return entity
  }

  instance.Cache = storeManager
  instance.withCache = bind(withCache, instance)

  return {
    onRequest: async ($eventStore, config, setReturnValue) => {
      const eventStore = evtStoreManager.get($eventStore)

      if (isNullish(eventStore)) return

      if (!eventStore.key) {
        eventStore.key = baseOptions.keyGenerator?.(config, eventStore) ?? axiosExt.getKeyByConfig(config)
        eventStore.key = String(eventStore.key)
      }

      try {
        const entity = await validateCache(eventStore)
        if (entity !== false) {
          return setReturnValue(Promise.resolve(entity.data))
        }
      } catch (error) {
        baseOptions.onError!(error)
      }
    },
    onResponse: ($eventStore, response) => {
      const eventStore = evtStoreManager.get($eventStore)

      if (isNullish(eventStore)) return

      if (baseOptions.allowCache?.(response, eventStore) ?? true) {
        const entity: AxiosExtCacheEntity = {
          key: eventStore.key,
          now: getNow(),
          expire: eventStore.expire,
          data: baseOptions.transformData!(response, eventStore)
        }
        storeManager.set(entity).catch(baseOptions.onError)
      }
    },
    onDestroy: () => {
      storeManager.destroy()
    }
  }
}

export default useAxiosExtCache
