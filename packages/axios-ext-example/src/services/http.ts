import useAxiosExt from '@iel/axios-ext'
import AxiosExtCache from '@iel/axios-ext-cache'
import AxiosExtCancelRepeat from '@iel/axios-ext-cancel-repeat'
import AxiosExtResponseWrap from '@iel/axios-ext-response-wrap'
import AxiosResponseTupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/lib/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/lib/adaptors'
import AxiosExtLog from '@iel/axios-ext-log'
import axios from 'axios'

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 5000
})

function initExts() {
  useAxiosExt(http)
    .use(AxiosExtCache, {
      onError: console.error,
      transformData: (response) => {
        console.log('transformData=========', response)
        return (<any>response.data).data
      },
      allowCache: (response) => {
        console.log('allowCache==============', response)
        return (<any>response.data).success
      }
    })
    .use(AxiosExtCancelRepeat, {
      globalNotAllowRepeat: true,
      onRepeat: () => [true, 'manualCancel']
    })
    .use(AxiosExtResponseWrap, {
      globalWithResponseWrap: true,
      wrapper: AxiosResponseTupleWrapper([ErrorAdaptor, SuccessAdaptor])
    })
    .use(AxiosExtLog, { globalOnResponse: true })
}

initExts()
