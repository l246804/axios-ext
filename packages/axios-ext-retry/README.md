# `@iel/axios-ext-retry`

> 为 `Axios` 扩展失败重连功能。

## 安装

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-retry -S
```

## 用法

```js
import { createAxios } from '@iel/axios-ext'
import AxiosExtRetryPlugin from '@iel/axios-ext-retry'
import axios from 'axios'

const http = createAxios(axios)

http.$axiosExt.use(AxiosExtRetryPlugin)

http
  .withRetry({ max: 3 })
  .get('/demo/list')
  .then((res) => {
    console.log(res)
  })
```
