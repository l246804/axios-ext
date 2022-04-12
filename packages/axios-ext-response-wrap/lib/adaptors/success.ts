import { isPlainObject } from '@iel/axios-ext-utils'
import { AxiosResponseAdaptor } from '.'

const adaptor: AxiosResponseAdaptor = function (responseData) {
  let isAdaption = false
  const result = {
    error: false,
    data: null,
    message: ''
  }

  const shouldHaveKeys = ['success', 'data', 'message']
  if (isPlainObject(responseData) && shouldHaveKeys.every((key) => key in responseData)) {
    isAdaption = true
    result.error = !(responseData.success ?? true)
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
