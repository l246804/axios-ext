import { AxiosExtPlugin, AxiosExtStatic, ChainShallowAxiosInstance } from '@iel/axios-ext'
import {
  isFunction,
  assignSafly,
  isBoolean,
  isString,
  isNullish,
  bind,
  Nullish,
  isSafeInteger,
  noop,
  deleteKeys
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

const useStoreManager = (store: LocalForage, axiosExt: AxiosExtStatic) => {
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
    let needsDeleteEntires: AxiosExtCacheEntity['key'][] = []

    let isInterrupted = false

    const interrupter = () => (isInterrupted = true)

    return store
      .iterate<AxiosExtCacheEntity, any>((entity, key) => {
        const valid = predicate?.(entity, key, interrupter) ?? false

        valid && needsDeleteEntires.push(entity.key)

        // interrupt iterate
        if (isInterrupted) {
          needsDeleteEntires = [entity.key]

          return true
        }
      })
      .then(() => Promise.all(needsDeleteEntires.map((key) => remove(key))))
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
  const _options: AxiosExtCacheOptions = assignSafly(options)
  if (!isFunction(_options.allowCache)) _options.allowCache = undefined
  if (!isFunction(_options.configStore)) _options.configStore = undefined
  if (!isFunction(_options.isExpired)) _options.isExpired = defaultIsExpired
  if (!isFunction(_options.keyGenerator)) _options.keyGenerator = undefined
  if (!isFunction(_options.onError)) _options.onError = noop
  if (!isFunction(_options.transformData)) _options.transformData = defaultTransformData

  return _options
}

const getValidArgs = (args: AxiosExtCacheArgs = {}) => {
  const _args: Required<AxiosExtCacheArgs> = assignSafly(defaultArgs(), args)
  if (!isBoolean(_args.forceUpdate)) _args.forceUpdate = !!_args.forceUpdate
  if (!isString(_args.key) && !isNullish(_args.key)) _args.key = String(_args.key)

  return _args
}

const useAxiosExtCache: AxiosExtPlugin<AxiosExtCacheOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const store = useStore(baseOptions)
  const storeManager = useStoreManager(store, axiosExt)
  const instance = axiosExt.instance

  let validArgs: Required<AxiosExtCacheArgs>

  const withCache: AxiosInstance['withCache'] = function (args) {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)
    deleteKeys(shallowInstance, ['withCache', 'Cache'])

    validArgs = getValidArgs(args)

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

    const expired = baseOptions.isExpired!(entity, validArgs)
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
    onRequest: async (config, setReturnValue) => {
      if (!validArgs.key) {
        validArgs.key = baseOptions.keyGenerator?.(config, validArgs) ?? axiosExt.getKeyByConfig(config)
        validArgs.key = String(validArgs.key)
      }

      try {
        const entity = await validateCache(validArgs)
        if (entity !== false) {
          return setReturnValue(Promise.resolve(entity.data))
        }
      } catch (error) {
        baseOptions.onError!(error)
      }
    },
    onResponse: (response) => {
      if (baseOptions.allowCache?.(response, validArgs) ?? true) {
        const entity: AxiosExtCacheEntity = {
          key: validArgs.key,
          now: getNow(),
          expire: validArgs.expire,
          data: baseOptions.transformData!(response, validArgs)
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
