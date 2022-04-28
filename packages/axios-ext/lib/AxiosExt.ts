import { assignSafely, isFunction, isPlainObject, isPromise, isString } from '@iel/axios-ext-utils'
import { AxiosInstance } from 'axios'
import { EVENT_STORE_KEY, isAxiosInstance, ShallowAxiosInstance, SHALLOW_INSTANCE_KEY } from './helper'
import { setupPlugin } from './lifecycle'
import AxiosExtPluginManager, { AxiosExtPlugin, AxiosExtPluginManagerInstance } from './PluginManager'

type AxiosRequestFnType = AxiosInstance['request']

export type AxiosExtInstance = AxiosExt

export type ProxyAxiosMethodNoData = 'delete' | 'get' | 'head' | 'options'
export type ProxyAxiosMethodWithData = 'post' | 'put' | 'patch'

const logPrefix = '[AxiosExt] - '

class AxiosExt {
  get _isAxiosExt() {
    return true
  }

  instance: AxiosInstance
  rawRequestFn: AxiosRequestFnType
  plugins: AxiosExtPluginManagerInstance

  constructor(instance: AxiosInstance) {
    if (!isAxiosInstance(instance)) {
      throw Error(`${logPrefix}参数 instance 必须是 Axios 的实例。`)
    }

    this.instance = instance
    this.rawRequestFn = instance.request
    this.plugins = new AxiosExtPluginManager()

    if (SHALLOW_INSTANCE_KEY in instance) {
      return this
    }

    this.init()
  }

  destroy() {
    this.plugins.runHooks('onDestroy')
    this.plugins.clear()
  }

  private init() {
    const instance = this.instance

    // 劫持 axios methods 方法
    const methodNoData: ProxyAxiosMethodNoData[] = ['delete', 'get', 'head', 'options']
    const methodWithData: ProxyAxiosMethodWithData[] = ['post', 'put', 'patch']

    methodNoData.forEach((method) => (instance[method] = this.proxyRequest(false)))
    methodWithData.forEach((method) => (instance[method] = this.proxyRequest(true)))

    // 劫持 request 请求
    instance.request = this.proxyRequest(false)
  }

  private proxyRequest(withData = false): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const axiosExt = this

    return function (this: ShallowAxiosInstance) {
      // 原始 axios 实例调用方法时不存在 eventStore
      const $eventStore = isPlainObject(this[EVENT_STORE_KEY]) ? this[EVENT_STORE_KEY] : {}

      // eslint-disable-next-line prefer-const, prefer-rest-params
      let [configOrUrl, configOrData, config] = Array.from(arguments)

      if (withData) {
        config = assignSafely(config, { url: configOrUrl, data: configOrData })
      } else {
        if (isString(configOrUrl || '')) {
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
          const onRequests = axiosExt.plugins.getHooks('onRequest')
          for (const onRequest of onRequests) {
            await onRequest(getHookParams({ setRequestFn, requestFn }))

            // 如果设置 returnValue 为 Promise ，则提前返回数据并终止后续操作
            if (isPromise(returnValue)) {
              return wrapResolve(returnValue)
            }
          }

          const response = await requestFn(config)

          setReturnValue(response)
          await axiosExt.plugins.runHooks('onResponse', getHookParams({ response }))
        } catch (error) {
          isError = true
          setReturnValue(Promise.reject(error))
          await axiosExt.plugins.runHooks('onResponseError', getHookParams({ error }))
        } finally {
          wrapResolve(returnValue)
          await axiosExt.plugins.runHooks('onFinally', { $eventStore, isError, returnValue, config })
        }
      })
    }
  }

  use<T = any>(plugin: AxiosExtPlugin<T>, options?: T) {
    if (!isFunction(plugin)) return this

    setupPlugin(this, plugin, options)

    return this
  }

  eject(plugin: AxiosExtPlugin) {
    if (this.plugins.has(plugin)) {
      this.plugins.delete(plugin)
    }

    return this
  }
}

export function createAxiosExt(instance: any): AxiosExtInstance {
  if (instance.$axiosExt) return instance.$axiosExt

  return new AxiosExt(instance)
}
