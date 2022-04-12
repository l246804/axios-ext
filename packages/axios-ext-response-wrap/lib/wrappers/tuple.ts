import { isArray } from '@iel/axios-ext-utils'
import { AxiosError, AxiosResponse } from 'axios'
import { AxiosResponseWrapper } from '..'
import { AxiosResponseAdaptor } from '../adaptors'
import { getResponseDataByAdaptors, getResponseErrorMsg } from './utils'

export type AxiosResponseTuple<T = any, D = any> = [
  error: boolean,
  data: T,
  responseOrError: AxiosResponse<T, D> | AxiosError<T, D>
]

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
