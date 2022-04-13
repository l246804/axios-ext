# `@iel/axios-ext-cache`

> 为 `Axios` 扩展缓存数据功能。

## Install

```bash
# 依赖 @iel/axios-ext localforage
npm i @iel/axios-ext localforage @iel/axios-ext-cache -S
```

## Usage

```js
import { createAxiosExt } from '@iel/axiosExt'
import AxiosExtCachePlugin from '@iel/axios-ext-cache'
import axios from 'axios'

const axiosExt = createAxiosExt(axios).use(AxiosExtCachePlugin)

// 响应成功时会缓存数据
// 下次调用时若过期则重新请求
// 可以设置 `forceUpdate` 强制更新缓存（即重新请求并缓存）
axios
  .withCache({ expire: 10e3 })
  .get('/demo/list')
  .then((res) => {
    console.log(res)
  })

// 在销毁实例，清理本地缓存数据
axiosExt.destroy()
```
