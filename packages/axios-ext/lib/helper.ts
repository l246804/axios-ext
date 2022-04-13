import { buildFullPath, extend, isPlainObject, pick, serialize } from '@iel/axios-ext-utils'
import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { AxiosExtInstance } from './AxiosExt'

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
 * 创建浅层拷贝实例
 */
export function createShallowAxiosInstance(axiosExt: AxiosExtInstance, thisArg: ChainShallowAxiosInstance) {
  const shallowAxiosInstance: any = axiosExt.rawRequestFn

  extend(shallowAxiosInstance, thisArg, shallowAxiosInstance)

  if (!isPlainObject(shallowAxiosInstance[EVENT_STORE_KEY])) {
    shallowAxiosInstance[EVENT_STORE_KEY] = {}
  }

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
