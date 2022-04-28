# `@iel/axios-ext-cache`

> 为 `Axios` 扩展缓存数据功能。

## 安装

```bash
# 依赖 @iel/axios-ext localforage
npm i @iel/axios-ext localforage @iel/axios-ext-cache -S
```

## 用法

```js
import { createAxios } from '@iel/axios-ext'
import AxiosExtCachePlugin from '@iel/axios-ext-cache'
import axios from 'axios'

const http = createAxios(axios)

http.$axiosExt.use(AxiosExtCachePlugin)

// 响应成功时会缓存数据
// 下次调用时若过期则重新请求
// 可以设置 `forceUpdate` 强制更新缓存（即重新请求并缓存）
http
  .withCache({ expire: 10e3 })
  .get('/demo/list')
  .then((res) => {
    console.log(res)
  })

// 手动清除缓存
http.Cache.remove({ method: 'get', url: '/demo/list' })

// 在销毁实例，清理本地缓存数据
http.$axiosExt.destroy()
```
