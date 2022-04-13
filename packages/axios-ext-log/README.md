# `@iel/axios-ext-log`

> 为 `Axios` 扩展阶段输出信息功能。

## Install

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-log -S
```

## Usage

```js
import { createAxiosExt } from '@iel/axiosExt'
import AxiosExtLogPlugin from '@iel/axios-ext-log'
import axios from 'axios'

const axiosExt = createAxiosExt(axios).use(AxiosExtLogPlugin, {
  // 所有接口响应后输出信息
  globalOnResponse: true
})

axios.get('/demo/list').then((res) => {
  console.log(res)
})

// 单独在请求时输出请求配置
axios
  .withLog({ onRequest: true })
  .get()
  .then((res) => {
    console.log(res)
  })
```
