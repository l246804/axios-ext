import { bind, buildFullPath, deepCopy, extend, pick, serialize } from '@iel/axios-ext-utils'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { AxiosExtInstance, createAxiosExt } from './AxiosExt'

/**
 * 是否为浅层拷贝实例标志
 */
export const SHALLOW_INSTANCE_KEY = '$$isShallowInstance'
/**
 * 事件仓储标志
 */
export const EVENT_STORE_KEY = '$$AXIOS_EXT_EVENT_STORE'

type AxiosRequestFnType = {
  (...args: Parameters<AxiosInstance>): ReturnType<AxiosInstance>
  (...args: Parameters<AxiosInstance['request']>): ReturnType<AxiosInstance>
}

export type ShallowAxiosInstance = AxiosInstance &
  AxiosRequestFnType & {
    [SHALLOW_INSTANCE_KEY]: boolean
    [EVENT_STORE_KEY]: Record<string, any>
  }
export type ChainShallowAxiosInstance = Partial<ShallowAxiosInstance>
export type OmitChainShallowAxiosInstance<T, K> = Omit<T, K extends keyof T ? K : never> & AxiosRequestFnType

export type EventStoreType = ShallowAxiosInstance[typeof EVENT_STORE_KEY]

/**
 * 判断是否为 axios 实例
 */
export function isAxiosInstance(context: any): context is AxiosInstance {
  return [axios.constructor, axios.Axios].some((ctor) => context instanceof ctor)
}

/**
 * 创建 axios 实例，用于弥补原始 axios 无法自调用触发插件规则
 */
export function createAxios(config?: AxiosInstance | AxiosRequestConfig) {
  const context = isAxiosInstance(config) ? config : axios.create(config)
  const axiosExt = createAxiosExt(context)
  const instance = createShallowAxiosInstance(axiosExt, context)

  const rawUse = bind(axiosExt.use, axiosExt)
  const use = function (...args: any) {
    const result = rawUse(...args)
    // 每次挂载完插件后需重新继承 axios 实例属性和方法，防止存在差异
    Promise.resolve(true).then(() => {
      extend(instance, axiosExt.instance)
    })
    return result
  }

  axiosExt.use = bind(use, axiosExt)
  instance.$axiosExt = axiosExt

  return instance as AxiosInstance & { $axiosExt: AxiosExtInstance }
}

/**
 * 创建浅层拷贝实例
 */
export function createShallowAxiosInstance(axiosExt: AxiosExtInstance, thisArg: ChainShallowAxiosInstance) {
  const shallowAxiosInstance: any = (...args: any) => {
    return axiosExt.instance.request.apply(thisArg, args)
  }

  extend(shallowAxiosInstance, thisArg, shallowAxiosInstance)

  shallowAxiosInstance[EVENT_STORE_KEY] = deepCopy(shallowAxiosInstance[EVENT_STORE_KEY] || {})
  shallowAxiosInstance[SHALLOW_INSTANCE_KEY] = true

  return shallowAxiosInstance as ShallowAxiosInstance
}

/**
 * 获取接口完整路径
 */
export function getFullPath(instance: AxiosInstance, url: string) {
  return buildFullPath(instance.defaults.baseURL, url)
}

/**
 * 根据请求配置项获取标识
 */
export function getKeyByConfig(instance: AxiosInstance, config: AxiosRequestConfig = {}) {
  const { method, url, data = {}, params = {} } = config

  return serialize({ method, url: getFullPath(instance, url || ''), data, params })
}

/**
 * 仅挑取请求配置项常用属性
 */
export function pickConfig(config: AxiosRequestConfig): Pick<AxiosRequestConfig, 'method' | 'url' | 'data' | 'params'> {
  return pick(config, ['method', 'url', 'data', 'params'])
}
