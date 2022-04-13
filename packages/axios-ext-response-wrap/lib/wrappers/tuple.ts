import { isArray } from '@iel/axios-ext-utils'
import { AxiosError, AxiosResponse } from 'axios'
import { AxiosResponseWrapper } from '..'
import { AxiosResponseAdaptor } from '../adaptors'
import { getResponseDataByAdaptors, getResponseErrorMsg } from './utils'

export type AxiosResponseTuple<T = any, D = any> = [
  /**
   * 是否错误
   */
  error: boolean,
  /**
   * 错误时为错误信息，成功时为响应数据
   */
  data: T,
  /**
   * 原始响应结果或错误
   */
  responseOrError: AxiosResponse<T, D> | AxiosError<T, D>
]

/**
 * 元祖响应包装器
 * 使用后将响应数据或错误信息以元祖形式返回。
 */
export default function tupleWrapper(adaptors: AxiosResponseAdaptor | AxiosResponseAdaptor[]) {
  const _adaptors = isArray(adaptors) ? adaptors : [adaptors]

  const wrapper: Required<AxiosResponseWrapper> = {
    transformResponseData: (response) => {
      const responseData = getResponseDataByAdaptors(response.data, _adaptors)

      if (response.status !== 200) return [true, getResponseErrorMsg(response), response]

      return [responseData.error, responseData.error ? responseData.message : responseData.data, response]
    },
    transformResponseError: (error) => {
      return [true, getResponseErrorMsg(error), error]
    }
  }

  return wrapper
}
