import useAxiosExt from '@iel/axios-ext'
import AxiosExtCache from '@iel/axios-ext-cache'
import AxiosExtCancelRepeat from '@iel/axios-ext-cancel-repeat'
import AxiosExtResponseWrapper from '@iel/axios-ext-response-wrapper'
import { isPromise } from '@iel/axios-ext-utils'
import axios from 'axios'

type AxiosResponseTuple<T = any> = [boolean, T, string]
declare module 'axios' {
  interface AxiosResponse<T = any> extends AxiosResponseTuple<T> {}
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 5000
})

function initExts() {
  useAxiosExt(http)
    .use(AxiosExtCache, {
      onError: console.error,
      allowCache: (response, args) => {
        console.log('allowCache', response, args)
        return true
      }
    })
    .use(AxiosExtCancelRepeat, {
      globalNotAllowRepeat: true,
      onRepeat: () => [true, 'Manual cancel.', 'manual']
    })
    .use(AxiosExtResponseWrapper, {})
    .use(() => ({
      onResponseFinally: async (e, value) =>
        console.log(
          'response finally: ',
          isPromise(value)
            ? await value.then((value: any) => value).catch((error: any) => Promise.resolve(error))
            : value
        )
    }))
}

initExts()
