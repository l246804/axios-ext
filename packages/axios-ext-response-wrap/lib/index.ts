import {
  AxiosExtPlugin,
  ChainShallowAxiosInstance,
  createShallowAxiosInstance,
  EVENT_STORE_KEY,
  OmitChainShallowAxiosInstance,
  onResponse,
  onResponseError
} from '@iel/axios-ext'
import {
  assignSafely,
  deleteKeys,
  helperCreateEventStoreManager,
  isBoolean,
  isFunction,
  isPromise,
  isPlainObject,
  noop
} from '@iel/axios-ext-utils'
import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    /**
     * 使用响应包装
     */
    withResponseWrap: <T = ChainShallowAxiosInstance>(
      this: T,
      args: AxiosExtResponseWrapArgs
    ) => OmitChainShallowAxiosInstance<T, 'withResponseWrap'>
  }
}

export type AxiosResponseWrapper = {
  /**
   * 转换响应数据
   */
  transformResponseData?: (response: AxiosResponse, config: AxiosRequestConfig) => any
  /**
   * 转换响应错误
   */
  transformResponseError?: (error: AxiosError, config: AxiosRequestConfig) => any
}

export type AxiosExtResponseWrapOptions = {
  /**
   * 是否全局默认使用响应包装
   *
   * @default false
   */
  globalWithResponseWrap?: boolean
  /**
   * 响应包装器
   */
  wrapper?: AxiosResponseWrapper
  [K: string]: any
} & AxiosResponseWrapper

export type AxiosExtResponseWrapArgs = {
  /**
   * 是否跳过全局响应包装（不推荐）
   *
   * @default false
   */
  skipGlobalResponseWrap?: boolean
  /**
   * 是否跳过全局响应错误包装（不推荐）
   *
   * @default false
   */
  skipGlobalErrorWrap?: boolean
  [K: string]: any
}

const getValidOptions = (options: AxiosExtResponseWrapOptions = {}) => {
  const _options: AxiosExtResponseWrapOptions = assignSafely(options)
  if (!isBoolean(_options.globalWithResponseWrap)) _options.globalWithResponseWrap = !!_options.globalWithResponseWrap
  if (!isPlainObject(_options.wrapper))
    _options.wrapper = { transformResponseData: undefined, transformResponseError: undefined }
  if (!isFunction(_options.transformResponseData))
    _options.transformResponseData = _options.wrapper.transformResponseData
  if (!isFunction(_options.transformResponseError))
    _options.transformResponseError = _options.wrapper.transformResponseError

  return _options
}

const getValidArgs = (args: AxiosExtResponseWrapArgs = {}, options: AxiosExtResponseWrapOptions = {}) => {
  const _args: Required<AxiosExtResponseWrapArgs> = assignSafely(
    {
      skipGlobalResponseWrap: !options.globalWithResponseWrap,
      skipGlobalErrorWrap: !options.globalWithResponseWrap
    },
    args
  )
  if (!isBoolean(_args.skipGlobalResponseWrap)) _args.skipGlobalResponseWrap = !!_args.skipGlobalResponseWrap
  if (!isBoolean(_args.skipGlobalErrorWrap)) _args.skipGlobalErrorWrap = !!_args.skipGlobalErrorWrap

  return _args
}

const evtStoreManager = helperCreateEventStoreManager<Required<AxiosExtResponseWrapArgs>>('ResponseWrap')

const AxiosExtResponseWrapPlugin: AxiosExtPlugin<AxiosExtResponseWrapOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withResponseWrap: AxiosInstance['withResponseWrap'] = function (args) {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)

    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], getValidArgs(args, baseOptions))
    deleteKeys(shallowInstance, ['withResponseWrap'])

    return shallowInstance as any
  }

  instance.withResponseWrap = withResponseWrap

  onResponse(({ $eventStore, response, config, resolve }) => {
    const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

    if (eventStore.skipGlobalResponseWrap || !isFunction(baseOptions.transformResponseData)) return

    resolve(baseOptions.transformResponseData(response, config))
  })

  onResponseError(({ $eventStore, error, config, returnValue, resolve }) => {
    const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

    if (eventStore.skipGlobalErrorWrap || !isFunction(baseOptions.transformResponseError)) return

    if (isPromise(returnValue)) returnValue.catch(noop)

    resolve(baseOptions.transformResponseError(error, config))
  })
}

export default AxiosExtResponseWrapPlugin
