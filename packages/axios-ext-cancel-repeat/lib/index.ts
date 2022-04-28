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
  onResponseError,
  onDestroy
} from '@iel/axios-ext'
import {
  assignSafely,
  deleteKeys,
  helperCreateEventStoreManager,
  isBoolean,
  isFunction,
  isNullish,
  isString,
  noop,
  Nullish
} from '@iel/axios-ext-utils'
import Axios, { AxiosInstance, AxiosRequestConfig, CancelToken } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    CancelRepeat: StoreManager
    /**
     * 不允许请求重复
     */
    notAllowRepeat: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtCancelRepeatArgs
    ) => OmitChainShallowAxiosInstance<T, 'notAllowRepeat' | 'allowRepeat' | 'CancelRepeat'>
    /**
     * 允许请求重复
     */
    allowRepeat: <T = ChainShallowAxiosInstance>(
      this: T
    ) => OmitChainShallowAxiosInstance<T, 'allowRepeat' | 'notAllowRepeat' | 'CancelRepeat'>
  }
}

export type AxiosExtCancelRepeatOptions = {
  /**
   * 是否全局默认不允许请求重复
   *
   * @default false
   */
  globalNotAllowRepeat?: boolean
  /**
   * 手动取消接口时的错误信息
   */
  manualCancelMessage?: any
  /**
   * 标识生成器，默认根据配置项常用属性生成唯一标识
   */
  keyGenerator?: (config: AxiosRequestConfig, args: AxiosExtCancelRepeatArgs) => string
  /**
   * 请求重复时需要返回的数据
   */
  onRepeat?: (config: AxiosRequestConfig, args: AxiosExtCancelRepeatArgs) => any
  [K: string]: any
}

export type AxiosExtCancelRepeatArgs = {
  /**
   * 请求标识
   */
  key?: AxiosExtPendingEntity['key']
  [K: string]: any
}

export type AxiosExtPendingEntity = {
  key: string
  config: AxiosRequestConfig
  cancel?: () => void
}

const getValidOptions = (options: AxiosExtCancelRepeatOptions = {}) => {
  const _options: AxiosExtCancelRepeatOptions = assignSafely({ globalNotAllowRepeat: false }, options)
  if (!isBoolean(_options.globalNotAllowRepeat)) _options.globalNotAllowRepeat = !!_options.globalNotAllowRepeat
  if (!isFunction(_options.keyGenerator)) _options.keyGenerator = undefined
  if (!isFunction(_options.onRepeat)) _options.onRepeat = noop

  return _options
}

const getValidArgs = (args: AxiosExtCancelRepeatArgs = {}) => {
  const _args: Required<AxiosExtCancelRepeatArgs> = assignSafely({ key: '' }, args)
  if (!isString(_args.key) && !isNullish(_args.key)) _args.key = String(_args.key)

  return _args
}

const useStore = () => new Map<string, AxiosExtPendingEntity>()

export type StoreManager = ReturnType<typeof useStoreManager>

const useStoreManager = (store: ReturnType<typeof useStore>, axiosExt: AxiosExtInstance) => {
  const get = (configOrKey: AxiosExtCancelRepeatArgs['key'] | AxiosRequestConfig): AxiosExtPendingEntity | null => {
    const key = isString(configOrKey) ? configOrKey : getKeyByConfig(axiosExt.instance, configOrKey)

    return store.get(key) ?? null
  }

  const set = (entity: AxiosExtPendingEntity) => {
    if (!entity?.key) return

    return store.set(entity.key, entity)
  }

  const remove = (configOrKey: AxiosExtPendingEntity['key'] | AxiosRequestConfig, syncCancel = true) => {
    const entity = get(configOrKey)

    if (entity === null) return false

    if (syncCancel) {
      entity.cancel?.()
    }

    return store.delete(entity.key)
  }

  const removeBy = (
    predicate: (entity: AxiosExtPendingEntity, key: AxiosExtPendingEntity['key'], interrupter: () => void) => boolean,
    syncCancel: boolean | ((entity: AxiosExtPendingEntity) => boolean) = true
  ) => {
    let needsDeleteEntities: AxiosExtPendingEntity['key'][] = []

    let isInterrupted = false

    const interrupter = () => (isInterrupted = true)

    for (const [key, value] of store.entries()) {
      const valid = predicate(value, key, interrupter) ?? false

      valid && needsDeleteEntities.push(key)

      if (isInterrupted) {
        needsDeleteEntities = [key]
        break
      }
    }

    return needsDeleteEntities
      .map((key) => remove(key, isFunction(syncCancel) ? syncCancel(get(key)!) : syncCancel))
      .every(Boolean)
  }

  const clear = () => {
    removeBy(() => true)
  }

  const destroy = () => {
    clear()
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

const AxiosExtCancelRepeatPlugin: AxiosExtPlugin<AxiosExtCancelRepeatOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const store = useStore()
  const storeManager = useStoreManager(store, axiosExt)
  const evtStoreManager = helperCreateEventStoreManager<{
    allowRepeat: boolean
    args: Required<AxiosExtCancelRepeatArgs> | Nullish
  }>('CancelRepeat')
  const instance = axiosExt.instance
  const extraMethods = ['notAllowRepeat', 'allowRepeat', 'CancelRepeat']

  const notAllowRepeat: AxiosInstance['notAllowRepeat'] = function (args) {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)
    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], { allowRepeat: false, args: getValidArgs(args) })
    deleteKeys(shallowInstance, extraMethods)

    return shallowInstance as any
  }

  const allowRepeat: AxiosInstance['allowRepeat'] = function () {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)
    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], { allowRepeat: true, args: null })
    deleteKeys(shallowInstance, extraMethods)

    return shallowInstance as any
  }

  const validateRepeat = (args: Required<AxiosExtCancelRepeatArgs>) => {
    return storeManager.get(args.key) !== null
  }

  const cleanOnResponseFinally = ({ $eventStore }: any) => {
    const args = evtStoreManager.get($eventStore)?.args

    if (isNullish(args)) return

    storeManager.remove(args.key, false)
  }

  instance.CancelRepeat = storeManager
  instance.notAllowRepeat = notAllowRepeat
  instance.allowRepeat = allowRepeat

  onRequest(({ $eventStore, config, setReturnValue }) => {
    let eventStore = evtStoreManager.get($eventStore)

    if (isNullish(eventStore)) {
      if (!baseOptions.globalNotAllowRepeat) return
      eventStore = evtStoreManager.set($eventStore, { allowRepeat: false, args: getValidArgs() })
    }
    if (eventStore.allowRepeat) return

    const args = eventStore.args!

    if (!args.key) {
      args.key = baseOptions.keyGenerator?.(config, args) ?? getKeyByConfig(axiosExt.instance, config)
      args.key = String(args.key)
    }

    if (validateRepeat(args)) {
      return setReturnValue(Promise.resolve(baseOptions.onRepeat!(config, args)))
    }

    const entity: AxiosExtPendingEntity = {
      key: args.key,
      config
    }
    storeManager.set(entity)

    if (!config.cancelToken) {
      config.cancelToken = new Axios.CancelToken((cancel) => {
        storeManager.get(entity.key)!.cancel = () => cancel(baseOptions.manualCancelMessage)
      })
    }
  })

  onResponse(cleanOnResponseFinally)
  onResponseError(cleanOnResponseFinally)

  onDestroy(() => {
    storeManager.destroy()
  })
}

export default AxiosExtCancelRepeatPlugin
