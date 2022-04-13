import { isFunction, noop } from '@iel/axios-ext-utils'
import { AxiosExtInstance } from './AxiosExt'
import {
  AxiosExtPlugin,
  AxiosExtPluginHooks,
  AxiosExtPluginOnDestroyHook,
  AxiosExtPluginOnFinallyHook,
  AxiosExtPluginOnRequestHook,
  AxiosExtPluginOnResponseErrorHook,
  AxiosExtPluginOnResponseHook
} from './PluginManager'

let currentInstance: AxiosExtInstance | null = null
let currentPlugin: AxiosExtPlugin | null = null

export type HelperCreateHook<T = any> = (callback: T) => void

/**
 * 请求时执行回调函数
 */
export let onRequest: HelperCreateHook<AxiosExtPluginOnRequestHook> = noop
/**
 * 响应时执行回调函数
 */
export let onResponse: HelperCreateHook<AxiosExtPluginOnResponseHook> = noop
/**
 * 响应失败时执行回调函数
 */
export let onResponseError: HelperCreateHook<AxiosExtPluginOnResponseErrorHook> = noop
/**
 * 最终结束时执行回调函数
 */
export let onFinally: HelperCreateHook<AxiosExtPluginOnFinallyHook> = noop
/**
 * 销毁时执行回调函数
 */
export let onDestroy: HelperCreateHook<AxiosExtPluginOnDestroyHook> = noop

function helperCreateHook<T = any>(name: keyof AxiosExtPluginHooks): any {
  return function (callback: T) {
    if (!isFunction(callback)) return

    currentInstance!.plugins.appendHookFn(currentPlugin!, name, callback.bind(null))
  }
}

function initLifecycle() {
  currentInstance = null
  currentPlugin = null

  onRequest = noop
  onResponse = noop
  onResponseError = noop
  onFinally = noop
  onDestroy = noop
}

/**
 * 安装插件
 */
export async function setupPlugin(axiosExt: AxiosExtInstance, plugin: AxiosExtPlugin, options: any = {}) {
  currentInstance = axiosExt
  currentPlugin = plugin

  axiosExt.plugins.set(plugin)

  onRequest = helperCreateHook('onRequest')
  onResponse = helperCreateHook('onResponse')
  onResponseError = helperCreateHook('onResponseError')
  onFinally = helperCreateHook('onFinally')
  onDestroy = helperCreateHook('onDestroy')

  try {
    await plugin(axiosExt, options)
  } catch (error) {
    console.error('[SetupPlugin] - ', error)
  } finally {
    initLifecycle()
  }
}
