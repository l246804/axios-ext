import { isPlainObject } from '@iel/axios-ext-utils'
import { AxiosResponseAdaptor } from '.'

/**
 * `error` 格式适配器
 *
 * @example
 * ```js
 * // 需要后端返回的数据格式
 * const responseData = {
 *    error: false,
 *    data: null,
 *    message: ''
 * }
 * ```
 */
const adaptor: AxiosResponseAdaptor = function (responseData) {
  let isAdaption = false
  const result = {
    error: false,
    data: null,
    message: ''
  }

  const shouldHaveKeys = ['error', 'data', 'message']
  if (isPlainObject(responseData) && shouldHaveKeys.every((key) => key in responseData)) {
    isAdaption = true
    result.error = !!responseData.error
    result.data = responseData.data ?? null
    result.message = result.error ? responseData.message : ''
  } else {
    result.data = responseData
  }

  return {
    isAdaption,
    result
  }
}

export default adaptor
