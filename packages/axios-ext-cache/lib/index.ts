import {
  AxiosExtPlugin,
  AxiosExtInstance,
  ChainShallowAxiosInstance,
  OmitChainShallowAxiosInstance,
  getKeyByConfig,
  createShallowAxiosInstance,
  EVENT_STORE_KEY,
  onRequest,
  onResponse,
  onDestroy
} from '@iel/axios-ext'
import {
  isFunction,
  assignSafely,
  isBoolean,
  isString,
  isNullish,
  Nullish,
  isSafeInteger,
  noop,
  deleteKeys,
  helperCreateEventStoreManager,
  omit,
  isObject
} from '@iel/axios-ext-utils'
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import localforage from 'localforage'

declare module 'axios' {
  interface AxiosInstance {
    Cache: StoreManager
    /**
     * 使用缓存功能
     */
    withCache: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtCacheArgs
    ) => OmitChainShallowAxiosInstance<T, 'withCache' | 'Cache'>
  }
}

export type AxiosExtCacheOptions = {
  /**
   * 缓存仓储名
   */
  storeName?: string | number
  /**
   * 配置仓储
   */
  configStore?: (store: LocalForage) => void
  /**
   * 标识生成器，默认根据配置项常用属性生成唯一标识
   */
  keyGenerator?: (config: AxiosRequestConfig, args: AxiosExtCacheArgs) => AxiosExtCacheEntity['key']
  /**
   * 判断缓存是否过期，默认根据过期时间验证
   */
  isExpired?: (entity: AxiosExtCacheEntity, config: AxiosRequestConfig, args: AxiosExtCacheArgs) => boolean
  /**
   * 是否允许缓存
   *
   * @default true
   */
  allowCache?: (response: AxiosResponse, config: AxiosRequestConfig, args: AxiosExtCacheArgs) => boolean
  /**
   * 缓存有效时返回的数据信息，默认返回 `response.data`
   */
  transformData?: (response: AxiosResponse, config: AxiosRequestConfig, args: AxiosExtCacheArgs) => any
  /**
   * 操作仓储失败时执行回调
   */
  onError?: (error: any) => void
  [K: string]: any
}

export type AxiosExtCacheArgs = {
  /**
   * 请求标识
   */
  key?: AxiosExtCacheEntity['key']
  /**
   * 过期时间
   */
  expire?: AxiosExtCacheEntity['expire']
  /**
   * 是否强制刷新缓存数据
   */
  forceUpdate?: boolean
  [K: string]: any
}

export type AxiosExtCacheEntity = {
  key: string
  now: number
  expire: number | null
  data: {
    response: AxiosResponse
    config: AxiosRequestConfig
    args: Required<AxiosExtCacheArgs>
  }
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

export type StoreManager = ReturnType<typeof useStoreManager>

const useStoreManager = (store: ReturnType<typeof useStore>, axiosExt: AxiosExtInstance) => {
  const get = async (
    configOrKey: AxiosExtCacheEntity['key'] | AxiosRequestConfig
  ): Promise<AxiosExtCacheEntity | null> => {
    const key = isString(configOrKey) ? configOrKey : getKeyByConfig(axiosExt.instance, configOrKey)

    return store.getItem(key)
  }

  const set = async (entity: AxiosExtCacheEntity) => {
    if (!entity?.key) return

    return store.setItem(entity.key, entity)
  }

  const remove = async (configOrKey: AxiosExtCacheEntity['key'] | AxiosRequestConfig) => {
    const key = isString(configOrKey) ? configOrKey : getKeyByConfig(axiosExt.instance, configOrKey)

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

const AxiosExtCachePlugin: AxiosExtPlugin<AxiosExtCacheOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const store = useStore(baseOptions)
  const storeManager = useStoreManager(store, axiosExt)
  const evtStoreManager = helperCreateEventStoreManager<Required<AxiosExtCacheArgs>>('Cache')
  const instance = axiosExt.instance

  const withCache: AxiosInstance['withCache'] = function (args) {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)
    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], getValidArgs(args))
    deleteKeys(shallowInstance, ['withCache', 'Cache'])

    return shallowInstance as any
  }

  const validateCache = async (args: Required<AxiosExtCacheArgs>, config: AxiosRequestConfig) => {
    let entity: AxiosExtCacheEntity | Nullish = null
    try {
      entity = await storeManager.get(args.key)
    } catch (error) {
      baseOptions.onError!(error)
    }
    if (!entity) return false

    const expired = baseOptions.isExpired!(entity, config, args)
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
  instance.withCache = withCache

  onRequest(async ({ $eventStore, config, setReturnValue }) => {
    const eventStore = evtStoreManager.get($eventStore)

    if (isNullish(eventStore)) return

    if (!eventStore.key) {
      eventStore.key = baseOptions.keyGenerator?.(config, eventStore) ?? getKeyByConfig(axiosExt.instance, config)
      eventStore.key = String(eventStore.key)
    }

    try {
      const entity = await validateCache(eventStore, config)
      if (entity !== false) {
        const { response, config, args } = entity.data

        return setReturnValue(Promise.resolve(baseOptions.transformData!(response, config, args)))
      }
    } catch (error) {
      baseOptions.onError!(error)
    }
  })

  onResponse(({ $eventStore, response, config }) => {
    const eventStore = evtStoreManager.get($eventStore)
    if (isNullish(eventStore)) return

    const allowCache = baseOptions.allowCache?.(response, config, eventStore) ?? true
    if (!allowCache) return

    const _response = {
      ...response,
      request: null,
      // 仅能存储非函数属性
      config: omit(response.config, (val) => isObject(val) || isFunction(val))
    }
    const entity: AxiosExtCacheEntity = {
      key: eventStore.key,
      now: getNow(),
      expire: eventStore.expire,
      data: { response: _response, config: _response.config, args: eventStore }
    }
    storeManager.set(entity).catch(baseOptions.onError)
  })

  onDestroy(() => {
    storeManager.destroy()
  })
}

export default AxiosExtCachePlugin
