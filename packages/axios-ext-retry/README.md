# `@iel/axios-ext-retry`

> 为 `Axios` 扩展失败重连功能。

## Install

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-retry -S
```

## Usage

```js
import { createAxiosExt } from '@iel/axiosExt'
import AxiosExtRetryPlugin from '@iel/axios-ext-retry'
import axios from 'axios'

const axiosExt = createAxiosExt(axios).use(AxiosExtRetryPlugin)

axios
  .withRetry({ max: 3 })
  .get('/demo/list')
  .then((res) => {
    console.log(res)
  })
```
