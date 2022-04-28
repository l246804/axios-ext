# `@iel/axios-ext-log`

> 为 `Axios` 扩展阶段输出信息功能。

## 安装

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-log -S
```

## 用法

```js
import { createAxios } from '@iel/axios-ext'
import AxiosExtLogPlugin from '@iel/axios-ext-log'
import axios from 'axios'

const http = createAxios(axios)

http.$axiosExt.use(AxiosExtLogPlugin, {
  // 所有接口响应后输出信息
  globalOnResponse: true
})

http.get('/demo/list').then((res) => {
  console.log(res)
})

// 单独在请求时输出请求配置
http
  .withLog({ onRequest: true })
  .get('/demo/list')
  .then((res) => {
    console.log(res)
  })
```
