import { AxiosExtPlugin } from '@iel/axios-ext'
import { assignSafely } from '@iel/axios-ext-utils'

export type AxiosExtRetryOptions = {
  [K: string]: any
}

const getValidOptions = (options: AxiosExtRetryOptions = {}) => {
  const _options: AxiosExtRetryOptions = assignSafely(options)

  return _options
}

const useAxiosExtRetry: AxiosExtPlugin<AxiosExtRetryOptions> = function (axiosExt, options) {
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

export default useAxiosExtRetry
