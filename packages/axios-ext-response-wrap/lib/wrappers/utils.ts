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

  return (
    getMsg(error) ||
    getMsg(error?.message) ||
    getMsg(error?.code) ||
    getMsg(getResponse(error)) ||
    getMsg(getResponse(error)?.data) ||
    getMsg(getResponse(error)?.data?.message) ||
    getMsg(getResponse(error)?.data?.data) ||
    getMsg(getResponse(error)?.statusText) ||
    getMsg(getResponse(error)?.status) ||
    UNKNOWN_ERROR
  )
}
