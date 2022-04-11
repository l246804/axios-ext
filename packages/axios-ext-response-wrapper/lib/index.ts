import { AxiosExtPlugin } from '@iel/axios-ext'
import { assignSafely } from '@iel/axios-ext-utils'

export type AxiosExtResponseWrapperOptions = {
  [K: string]: any
}

const getValidOptions = (options: AxiosExtResponseWrapperOptions = {}) => {
  const _options: AxiosExtResponseWrapperOptions = assignSafely(options)

  return _options
}

const useAxiosExtResponseWrapper: AxiosExtPlugin<AxiosExtResponseWrapperOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  console.log(baseOptions, instance)

  return {
    onRequest: ($eventStore, config, setReturnValue) => {
      // on request
    },
    onResponse: ($eventStore, response) => {
      // on response
    },
    onResponseError: ($eventStore, error) => {
      // on response error
    },
    onResponseFinally: () => {
      // on response finally
    }
  }
}

export default useAxiosExtResponseWrapper
