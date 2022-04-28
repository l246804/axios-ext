# `@iel/axios-ext-cancel-repeat`

> 为 `Axios` 扩展取消重复请求功能。

## 安装

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-cancel-repeat -S
```

## 用法

```js
import { createAxios } from '@iel/axios-ext'
import AxiosExtCancelRepeatPlugin from '@iel/axios-ext-cancel-repeat'
import axios from 'axios'

const http = createAxios(axios)

http.$axiosExt.use(AxiosExtCancelRepeatPlugin, {
  // 当被取消时接口返回该数据
  onRepeat: () => [true, 'repeatCancel']
})

http.get('/demo/list').then((res) => {
  console.log(res)

  // 判断是否为重复取消请求，用于区分重复取消和超时取消
  // 重复取消时后续代码将不再执行
  if (Array.isArray(res) && res[1] === 'repeatCancel') return
})

// 手动取消未完成请求并移除记录
http.CancelRepeat.remove({ method: 'get', url: '/demo/list' })

// 在销毁实例，清理缓存数据
http.$axiosExt.destroy()
```
