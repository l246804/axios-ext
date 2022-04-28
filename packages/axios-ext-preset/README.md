# `@iel/axios-ext-preset`

> 为 `AxiosExt` 预设插件功能。

## 安装

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-preset -S
```

## 用法

```ts
import { AxiosExtInstance, createAxios, OmitChainShallowAxiosInstance } from '@iel/axios-ext'
import TupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/dist/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/dist/adaptors'
import usePresetForAxiosExt from '@iel/axios-ext-preset'
import { AxiosInstance } from 'axios'

declare module 'axios' {
  // 修改响应结果为元祖
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

// 移除关闭预设插件的功能定义
type IAxiosInstance = OmitChainShallowAxiosInstance<AxiosInstance, 'withLog'>

export const http: IAxiosInstance & { $axiosExt: AxiosExtInstance } = createAxios({
  baseURL: '/api',
  timeout: 5000
}) as any

function initExt() {
  // 元祖响应格式包装器
  // adaptor 为数据适配器，处理后端返回数据格式
  const tupleWrapper = TupleWrapper([ErrorAdaptor, SuccessAdaptor])

  // 为 axiosExt 预设插件功能
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
      onRepeat: () => [true, 'repeatCancel']
    },
    // 配置响应包装
    ResponseWrap: {
      wrapper: tupleWrapper
    },
    // 关闭 `AxiosExtLog` 插件
    Log: {
      preset: false
    }
  })
}

initExt()
```
