# `@iel/axios-ext`

> 为 `Axios` 扩展辅助功能。

## Install

```bash
npm i @iel/axios-ext -S
```

## Usage

```js
import { createAxiosExt, onRequest } from '@iel/axiosExt'
import axios from 'axios'

// 接收一个 Axios 实例并返回 AxiosExt 实例
const axiosExt = createAxiosExt(axios)

// 定义一个 AxiosExt 插件，接收默认配置项
// 返回 axios 请求流程的钩子函数
const Plugin = (axiosExt, options) => {
  onRequest(() => {
    // on request hook
  })
}

// 注册该插件，默认会执行插件方法体内部函数
// 返回该实例，已注册插件不会被重复注册
axiosExt.use(Plugin, {}).use(Plugin, {})

// 销毁实例，在插件销毁时处理一些事情并清理所有插件信息
axiosExt.destroy()
```

## 已知问题

由于 `axios` 内部使用闭包保护自调用 `request` ，所以由插件扩展的功能无法在实例自调用时使用！

```js
import axios from 'axios'
import { createAxiosExt } from '@iel/axios-ext'
import AxiosExtLog from '@iel/axios-ext-log'

const http = axios.create({
  baseURL: '/api'
})

const axiosExt = createAxiosExt(http).use(AxiosExtLog, { globalOnResponse: true })

// ✔️ 会正常打印信息
http.get('/demo/list').then((response) => {
  // do somethings
})

// ✔️ 会正常打印信息
http
  .withLog({ onRequest: true })
  .get('/demo/list')
  .then((response) => {
    // do somethings
  })

// ❌ 扩展功能不起作用
http().then((response) => {
  // do somethings
})

// ❌ 扩展功能不起作用
http
  .withLog({ onRequest: true })({ method: 'get', url: '/demo/list' })
  .then((response) => {
    // do somethings
  })
```
