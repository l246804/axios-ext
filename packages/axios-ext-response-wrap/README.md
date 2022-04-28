# `@iel/axios-ext-response-wrap`

> 为 `axios` 扩展响应包装功能。

## 安装

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-response-wrap -S
```

## 用法

```js
import { createAxios } from '@iel/axios-ext'
import AxiosExtResponseWrapPlugin from '@iel/axios-ext-response-wrap'
import TupleWrapper, { AxiosResponseTuple } from '@iel/axios-ext-response-wrap/dist/wrappers/tuple'
import { ErrorAdaptor, SuccessAdaptor } from '@iel/axios-ext-response-wrap/dist/adaptors'
import axios, { AxiosInstance } from 'axios'

declare module 'axios' {
  // 修改响应结果为元祖
  interface AxiosResponse<T = any, D = any> extends AxiosResponseTuple<T, D> {}
}

const http = createAxios(axios)

http.$axiosExt.use(AxiosExtResponseWrapPlugin, {
  wrapper: AxiosResponseTupleWrapper([ErrorAdaptor, SuccessAdaptor])
})

const loadData = async () => {
  const [error, data] = await http.get('/demo/list')
  if (error) {
    // data is error message
    return console.log('error message: ', data)
  }
  // response data
  console.log(data)
}
```
