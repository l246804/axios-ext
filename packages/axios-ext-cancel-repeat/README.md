# `@iel/axios-ext-cancel-repeat`

> 为 `Axios` 扩展取消重复请求功能。

## Install

```bash
# 依赖 @iel/axios-ext
npm i @iel/axios-ext @iel/axios-ext-cancel-repeat -S
```

## Usage

```js
import { createAxiosExt } from '@iel/axiosExt'
import AxiosExtCancelRepeatPlugin from '@iel/axios-ext-cancel-repeat'
import axios from 'axios'

const axiosExt = createAxiosExt(axios).use(AxiosExtCancelRepeatPlugin, {
  // 当被取消时接口返回该数据
  onRepeat: () => [true, 'repeatCancel']
})

axios.get('/demo/list').then((res) => {
  console.log(res)

  // 判断是否为重复取消请求，用于区分重复取消和超时取消
  // 重复取消时后续代码将不再执行
  if (Array.isArray(res) && res[1] === 'repeatCancel') return
})

// 在销毁实例，清理缓存数据
axiosExt.destroy()
```
