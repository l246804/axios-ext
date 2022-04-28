import { createAxios } from '@iel/axios-ext'
import TupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/dist/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/dist/adaptors'
import usePresetForAxiosExt from '@iel/axios-ext-preset'

declare module 'axios' {
  // 修改响应结果为元祖
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

export const http = createAxios({
  baseURL: 'https://www.fastmock.site/mock/9f00454804589fac6a7f595c559d2ab8/api',
  timeout: 5000
})

function initExt() {
  // 元祖响应格式包装器
  // adaptor 为数据适配器，处理后端返回数据格式
  const tupleWrapper = TupleWrapper([ErrorAdaptor, SuccessAdaptor])

  // 为 axiosExt 预设插件
  usePresetForAxiosExt(http.$axiosExt, {
    // 配置缓存功能
    Cache: {
      // 当缓存有效时需要返回的数据
      transformData: (response, config) => tupleWrapper.transformResponseData(response, config),
      // 当响应成功时判断是否需要缓存数据
      allowCache: (response, config) => !tupleWrapper.transformResponseData(response, config)[0]
    },
    // 配置取消重复请求
    CancelRepeat: {
      onRepeat: () => [true, '取消重复接口']
    },
    // 配置响应包装
    ResponseWrap: {
      wrapper: tupleWrapper
    }
  })
}

initExt()
