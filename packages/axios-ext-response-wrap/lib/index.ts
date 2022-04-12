import { AxiosExtPlugin, ChainShallowAxiosInstance, OmitChainShallowAxiosInstance } from '@iel/axios-ext'
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
    withResponseWrap: <T = ChainShallowAxiosInstance>(
      this: T,
      args: AxiosExtResponseWrapArgs
    ) => OmitChainShallowAxiosInstance<T, 'withResponseWrap'>
  }
}

export type AxiosResponseWrapper = {
  transformResponseData?: (response: AxiosResponse, config: AxiosRequestConfig) => any
  transformResponseError?: (error: AxiosError, config: AxiosRequestConfig) => any
}

export type AxiosExtResponseWrapOptions = {
  globalWithResponseWrap?: boolean
  wrapper?: AxiosResponseWrapper
  [K: string]: any
} & AxiosResponseWrapper

export type AxiosExtResponseWrapArgs = {
  skipGlobalResponseWrap?: boolean
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

const useAxiosExtResponseWrap: AxiosExtPlugin<AxiosExtResponseWrapOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withResponseWrap: AxiosInstance['withResponseWrap'] = function (args) {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)

    evtStoreManager.set(shallowInstance.$eventStore, getValidArgs(args, baseOptions))
    deleteKeys(shallowInstance, ['withResponseWrap'])

    return shallowInstance as any
  }

  instance.withResponseWrap = withResponseWrap

  return {
    onResponse: ({ $eventStore, response, config, resolve }) => {
      const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

      if (eventStore.skipGlobalResponseWrap || !isFunction(baseOptions.transformResponseData)) return

      resolve(baseOptions.transformResponseData(response, config))
    },
    onResponseError: ({ $eventStore, error, config, returnValue, resolve }) => {
      const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

      if (eventStore.skipGlobalErrorWrap || !isFunction(baseOptions.transformResponseError)) return

      if (isPromise(returnValue)) returnValue.catch(noop)

      resolve(baseOptions.transformResponseError(error, config))
    }
  }
}

export default useAxiosExtResponseWrap
