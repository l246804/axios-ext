import { AxiosExtInstance, createAxios } from '@iel/axios-ext'
import AxiosResponseTupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/lib/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/lib/adaptors'
import useAxiosExtPreset from '@iel/axios-ext-preset'

declare module 'axios' {
  interface AxiosInstance {
    $axiosExt: AxiosExtInstance
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

export const http = createAxios({
  baseURL: 'https://www.fastmock.site/mock/9f00454804589fac6a7f595c559d2ab8/api',
  timeout: 5000
})

function initExt() {
  const tupleWrapper = AxiosResponseTupleWrapper([ErrorAdaptor, SuccessAdaptor])
  const axiosExt = useAxiosExtPreset(http as any, {
    Cache: {
      transformData: (response, config) => tupleWrapper.transformResponseData(response, config),
      allowCache: (response, config) => !tupleWrapper.transformResponseData(response, config)[0]
    },
    CancelRepeat: {
      onRepeat: () => [true, '取消重复接口']
    },
    ResponseWrap: {
      wrapper: tupleWrapper
    }
  })

  http.$axiosExt = axiosExt
}

initExt()
