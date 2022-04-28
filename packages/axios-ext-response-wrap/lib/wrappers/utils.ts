import { isSafeInteger, isString } from '@iel/axios-ext-utils'
import { AxiosResponseAdaptor } from '../adaptors'

export function getResponseDataByAdaptors(
  responseData: any,
  adaptors: AxiosResponseAdaptor[]
): ReturnType<AxiosResponseAdaptor>['result'] {
  for (const adaptor of adaptors) {
    const { isAdaption, result } = adaptor(responseData)
    if (isAdaption) return result
  }
  return {
    error: false,
    data: responseData,
    message: ''
  }
}

export function getResponseErrorMsg(error: any) {
  const getMsg = (data: any) => (isString(data) || isSafeInteger(data) ? data : '')
  const getResponse = (data: any) => data?.response ?? data

  const UNKNOWN_ERROR = '未知错误'

  if (!error) return UNKNOWN_ERROR

  const response = getResponse(error)

  return (
    getMsg(response) ||
    getMsg(response?.data?.message) ||
    getMsg(response?.data?.data) ||
    getMsg(response?.data) ||
    getMsg(error?.message) ||
    getMsg(response?.statusText) ||
    getMsg(response?.status) ||
    getMsg(error?.code) ||
    UNKNOWN_ERROR
  )
}
