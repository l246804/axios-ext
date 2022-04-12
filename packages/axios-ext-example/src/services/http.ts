import { AxiosExtInstance, OmitChainShallowAxiosInstance } from '@iel/axios-ext'
import AxiosResponseTupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/lib/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/lib/adaptors'
import axios, { AxiosInstance } from 'axios'
import useAxiosExtPreset from '@iel/axios-ext-preset'

declare module 'axios' {
  interface AxiosInstance {
    $axiosExt: AxiosExtInstance
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

type IAxiosInstance = OmitChainShallowAxiosInstance<AxiosInstance, 'withLog'>

export const http: IAxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 5000
})

function initExts() {
  const tupleWrapper = AxiosResponseTupleWrapper([ErrorAdaptor, SuccessAdaptor])
  const axiosExt = useAxiosExtPreset(http as any, {
    Cache: {
      transformData: (response, config) => tupleWrapper.transformResponseData(response, config),
      allowCache: (response, config) => !tupleWrapper.transformResponseData(response, config)[0]
    },
    CancelRepeat: {
      onRepeat: () => [true, 'manualCancel']
    },
    ResponseWrap: {
      wrapper: tupleWrapper
    },
    Log: {
      preset: false
    }
  })

  http.$axiosExt = axiosExt
}

initExts()
