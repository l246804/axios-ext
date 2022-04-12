import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  buildFullPath,
  assignSafely,
  extend,
  pick,
  serialize,
  isFunction,
  isPromise,
  isString,
  isPlainObject
} from '@iel/axios-ext-utils'

declare module 'axios' {
  interface AxiosRequestConfig {
    [K: string]: any
  }
}

export type ProxyAxiosMethodNoData = 'delete' | 'get' | 'head' | 'options'
export type ProxyAxiosMethodWithData = 'post' | 'put' | 'patch'
export type ProxyAxiosMethod = ProxyAxiosMethodNoData | ProxyAxiosMethodWithData

type AxiosRequestFnType = {
  (...args: Parameters<AxiosInstance>): ReturnType<AxiosInstance>
  (...args: Parameters<AxiosInstance['request']>): ReturnType<AxiosInstance>
}
export type ShallowAxiosInstance = AxiosInstance &
  AxiosRequestFnType & {
    $eventStore: Record<string, any>
    _isShallowInstance: boolean
  }
export type ChainShallowAxiosInstance = Partial<ShallowAxiosInstance>
export type OmitChainShallowAxiosInstance<T, K> = Omit<T, K extends keyof T ? K : never> & AxiosRequestFnType

export type AxiosExtInstance = AxiosExt

export type AxiosExtPluginHook = {
  onRequest?: (args: {
    $eventStore: ShallowAxiosInstance['$eventStore']
    config: AxiosRequestConfig
    returnValue: any
    setReturnValue: (value: any) => void
    requestFn: AxiosInstance['request']
    setRequestFn: (fn: any) => void
    resolve: (value: any) => void
    reject: (error: any) => void
  }) => void
  onResponse?: (args: {
    $eventStore: ShallowAxiosInstance['$eventStore']
    response: AxiosResponse
    config: AxiosRequestConfig
    returnValue: any
    setReturnValue: (value: any) => void
    resolve: (value: any) => void
    reject: (error: any) => void
  }) => void
  onResponseError?: (args: {
    $eventStore: ShallowAxiosInstance['$eventStore']
    error: AxiosError
    config: AxiosRequestConfig
    returnValue: any
    setReturnValue: (value: any) => void
    resolve: (value: any) => void
    reject: (error: any) => void
  }) => void
  onResponseFinally?: (args: {
    isError: boolean
    $eventStore: ShallowAxiosInstance['$eventStore']
    returnValue: any
    config: AxiosRequestConfig
  }) => void
  onDestroy?: () => void
}
export type AxiosExtPlugin<T = any> = (axiosExt: AxiosExt, options?: T) => AxiosExtPluginHook

class AxiosExt {
  instance: AxiosInstance
  rawRequestFn: AxiosInstance['request']
  private plugins: Map<AxiosExtPlugin, AxiosExtPluginHook>

  constructor(instance: AxiosInstance) {
    if (!(instance instanceof axios.constructor)) {
      throw Error("The instance of parameter must be a Axios's instance.")
    }

    this.instance = instance
    this.rawRequestFn = instance.request
    this.plugins = new Map()

    this.init()
  }

  destroy() {
    this.plugins.forEach((hook) => isFunction(hook?.onDestroy) && hook!.onDestroy())
  }

  private init() {
    const instance = this.instance

    if ((<any>instance)._isShallowInstance) return

    // 劫持 axios methods 方法
    const methodNoData: ProxyAxiosMethodNoData[] = ['delete', 'get', 'head', 'options']
    const methodWithData: ProxyAxiosMethodWithData[] = ['post', 'put', 'patch']

    methodNoData.forEach((method) => (instance[method] = this.proxyRequest(false)))
    methodWithData.forEach((method) => (instance[method] = this.proxyRequest(true)))

    // 更改 request 请求
    instance.request = this.proxyRequest(false)
  }

  private proxyRequest(withData = false): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const axiosExt = this

    return function (this: ShallowAxiosInstance) {
      const $eventStore = this.$eventStore
      // eslint-disable-next-line prefer-const, prefer-rest-params
      let [configOrUrl, configOrData, config] = Array.from(arguments)

      if (withData) {
        config = assignSafely(config, { url: configOrUrl, data: configOrData })
      } else {
        if (isString(configOrUrl ?? '')) {
          config = assignSafely(config, { url: configOrUrl })
        } else {
          config = assignSafely(config, configOrUrl)
        }
      }

      return new Promise(async (resolve, reject) => {
        const wrapResolve: any = (value: any) => {
          if (wrapResolve.resolved) return
          wrapResolve.resolved = true

          setReturnValue(value)
          resolve(value)
        }

        let returnValue: any = null
        const setReturnValue = (value: any) => {
          returnValue = value
        }

        let requestFn = axiosExt.rawRequestFn
        const setRequestFn = (fn: any) => {
          if (!isFunction(fn)) return

          requestFn = fn
        }

        const getHookParams = (params: any = {}) => ({
          $eventStore,
          config,
          resolve: wrapResolve,
          reject,
          setReturnValue,
          returnValue,
          ...params
        })

        let isError = false

        try {
          const onRequests = axiosExt.getHooks('onRequest')
          for (const onRequest of onRequests) {
            await onRequest(getHookParams({ setRequestFn, requestFn }))

            // 如果设置 returnValue 为 Promise ，则提前返回数据并终止后续操作
            if (isPromise(returnValue)) {
              return wrapResolve(returnValue)
            }
          }

          const response = await requestFn(config)

          setReturnValue(response)
          await axiosExt.runHooks('onResponse', getHookParams({ response }))
        } catch (error) {
          isError = true
          setReturnValue(Promise.reject(error))
          await axiosExt.runHooks('onResponseError', getHookParams({ error }))
        } finally {
          wrapResolve(returnValue)
          await axiosExt.runHooks('onResponseFinally', { $eventStore, isError, returnValue, config })
        }
      })
    }
  }

  private getHooks(name: keyof AxiosExtPluginHook) {
    return Array.from(this.plugins.values())
      .map((hook) => hook[name])
      .filter((hookFn) => isFunction(hookFn)) as ((...args: any) => any)[]
  }

  private runHooks(name: keyof AxiosExtPluginHook, ...args: any) {
    // eslint-disable-next-line prefer-spread
    return Promise.all(this.getHooks(name).map((fn) => fn.apply(null, args)))
  }

  createShallowAxiosInstance(thisArg: ChainShallowAxiosInstance = this.instance, needsEventStore = true) {
    const shallowAxiosInstance: any = this.rawRequestFn

    extend(shallowAxiosInstance, thisArg, shallowAxiosInstance)

    if (needsEventStore && !isPlainObject(shallowAxiosInstance.$eventStore)) {
      shallowAxiosInstance.$eventStore = {}
    }

    shallowAxiosInstance._isShallowInstance = true
    return shallowAxiosInstance as ShallowAxiosInstance
  }

  getFullPath(url: string) {
    return buildFullPath(this.instance.defaults.baseURL, url)
  }

  getKeyByConfig(config: AxiosRequestConfig = {}) {
    const { method, url, data = {}, params = {} } = config

    return serialize({ method, url: this.getFullPath(url || ''), data, params })
  }

  pickConfig(config: AxiosRequestConfig): Pick<AxiosRequestConfig, 'method' | 'url' | 'data' | 'params'> {
    return pick(config, ['method', 'url', 'data', 'params'])
  }

  use<T = any>(plugin: AxiosExtPlugin<T>, options?: T) {
    if (isFunction(plugin) && !this.plugins.has(plugin)) {
      this.plugins.set(plugin, plugin(this, options))
    }

    return this
  }

  eject(plugin: AxiosExtPlugin) {
    if (this.plugins.has(plugin)) {
      this.plugins.delete(plugin)
    }

    return this
  }
}

export default function useAxiosExt(instance: any): AxiosExtInstance {
  return new AxiosExt(instance)
}
