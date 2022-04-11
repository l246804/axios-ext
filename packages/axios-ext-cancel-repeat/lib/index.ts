import { AxiosExtPlugin, AxiosExtInstance, ChainShallowAxiosInstance } from '@iel/axios-ext'
import {
  assignSafely,
  bind,
  deleteKeys,
  helperCreateEventStoreManager,
  isBoolean,
  isFunction,
  isNullish,
  isString,
  noop,
  Nullish
} from '@iel/axios-ext-utils'
import { AxiosInstance, AxiosRequestConfig } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    CancelRepeat: ReturnType<typeof useStoreManager>
    notAllowRepeat: <T extends ChainShallowAxiosInstance = any>(
      this: T,
      args?: AxiosExtCancelRepeatArgs
    ) => Omit<T, 'notAllowRepeat' | 'allowRepeat' | 'CancelRepeat'>
    allowRepeat: <T extends ChainShallowAxiosInstance = any>(
      this: T
    ) => Omit<T, 'allowRepeat' | 'notAllowRepeat' | 'CancelRepeat'>
  }
}

export type AxiosExtCancelRepeatOptions = {
  globalNotAllowRepeat?: boolean
  keyGenerator?: (config: AxiosRequestConfig, args: AxiosExtCancelRepeatArgs) => string
  onRepeat?: (config: AxiosRequestConfig, args: AxiosExtCancelRepeatArgs) => any
  [K: string]: any
}

export type AxiosExtCancelRepeatArgs = {
  key?: string
  [K: string]: any
}

export type AxiosExtPendingEntity = {
  key: string
  config: AxiosRequestConfig
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

const useStoreManager = (store: ReturnType<typeof useStore>, axiosExt: AxiosExtInstance) => {
  const get = (configOrKey: AxiosExtCancelRepeatArgs['key'] | AxiosRequestConfig) => {
    const key = isString(configOrKey) ? configOrKey : axiosExt.getKeyByConfig(configOrKey)

    return store.get(key) ?? null
  }

  const set = (entity: AxiosExtPendingEntity) => {
    if (!entity?.key) return

    return store.set(entity.key, entity)
  }

  const remove = (configOrKey: AxiosExtPendingEntity['key'] | AxiosRequestConfig) => {
    const key = isString(configOrKey) ? configOrKey : axiosExt.getKeyByConfig(configOrKey)

    return store.delete(key)
  }

  const removeBy = (
    predicate: (entity: AxiosExtPendingEntity, key: AxiosExtPendingEntity['key'], interrupter: () => void) => boolean
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

    return needsDeleteEntities.map((key) => remove(key)).every(Boolean)
  }

  const clear = () => {
    return store.clear()
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

const useAxiosExtCancelRepeat: AxiosExtPlugin<AxiosExtCancelRepeatOptions> = function (axiosExt, options) {
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
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)
    evtStoreManager.set(shallowInstance.$eventStore, { allowRepeat: false, args: getValidArgs(args) })
    deleteKeys(shallowInstance, extraMethods)

    return shallowInstance as any
  }

  const allowRepeat: AxiosInstance['allowRepeat'] = function () {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)
    evtStoreManager.set(shallowInstance.$eventStore, { allowRepeat: true, args: null })
    deleteKeys(shallowInstance, extraMethods)

    return shallowInstance as any
  }

  const validateRepeat = (args: Required<AxiosExtCancelRepeatArgs>) => {
    return storeManager.get(args.key) !== null
  }

  const cleanOnResponseFinally = ($eventStore: any) => {
    const args = evtStoreManager.get($eventStore)?.args

    if (isNullish(args)) return

    storeManager.remove(args.key)
  }

  instance.notAllowRepeat = bind(notAllowRepeat, instance)
  instance.allowRepeat = bind(allowRepeat, instance)

  return {
    onRequest: ($eventStore, config, setReturnValue) => {
      let eventStore = evtStoreManager.get($eventStore)

      if (isNullish(eventStore)) {
        if (!baseOptions.globalNotAllowRepeat) return
        eventStore = evtStoreManager.set($eventStore, { allowRepeat: false, args: getValidArgs() })
      }
      if (eventStore.allowRepeat) return

      const args = eventStore.args!

      if (!args.key) {
        args.key = baseOptions.keyGenerator?.(config, args) ?? axiosExt.getKeyByConfig(config)
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
    },
    onResponse: cleanOnResponseFinally,
    onResponseError: cleanOnResponseFinally,
    onDestroy: () => {
      storeManager.destroy()
    }
  }
}

export default useAxiosExtCancelRepeat
