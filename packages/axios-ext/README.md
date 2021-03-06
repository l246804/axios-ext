# `@iel/axios-ext`

> 为 `Axios` 扩展辅助功能。

## 安装

```bash
npm i axios @iel/axios-ext -S
```

## 用法

由于 `axios` 内部使用闭包保护自调用 `request` ，所以需使用插件提供的 `createAxios` 方法获取 `axios` 实例，否则由插件扩展的功能无法在实例自调用时使用！

```js
import { createAxios, onRequest } from '@iel/axios-ext'
import axios from 'axios'

// 可以接收 axios 配置项或实例对象
// 返回包装后的 axios 实例
// http.$axiosExt 为 AxiosExt 实例
const http = createAxios(http)

// 定义一个 AxiosExt 插件，接收默认配置项
const Plugin = (axiosExt, options) => {
  // 注册请求时的回调函数
  onRequest(() => {
    // on request hook
  })
}

// 注册该插件，默认会执行插件方法体内部函数
// 返回该实例，已注册插件不会被重复注册
http.$axiosExt.use(Plugin, {}).use(Plugin, {})

// 销毁实例，在插件销毁时处理一些任务并清理所有插件信息
http.$axiosExt.destroy()
```

## 示例

```js
import axios from 'axios'
import { createAxiosExt, createAxios } from '@iel/axios-ext'
import AxiosExtLog from '@iel/axios-ext-log'

//============普通创建============
const http = axios.create({
  baseURL: '/api'
})

// 注册日志插件
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

// ✔️ 会正常打印信息
http
  .withLog({ onRequest: true })({ method: 'get', url: '/demo/list' })
  .then((response) => {
    // do somethings
  })

//============通过插件提供方法创建============
const http2 = createAxios(http)

// 注册日志插件
http2.$axiosExt.use(AxiosExtLog, { globalOnResponse: true })

// ✔️ 会正常打印信息
http2().then((response) => {
  // do somethings
})
```

## 开发插件包

插件内部提供了对请求流阶段的辅助工具，可以通过在不同阶段对相关数据操作进而完成对应功能的实现。

### 示例

这里演示开发一个在请求时自动携带 `token` 的插件。

```js
// auto-add-token.js
import { onRequest } from '@iel/axios-ext'

// 插件初始化时会传入 axiosExt 实例以及插件所需的配置项
export default function autoAddToken(axiosExt, opts = {}) {
  // 在请求阶段时修改 config 配置项为其添加 token
  onRequest(({ config }) => {
    config.headers.Authorization = localStorage.token || ''
  })
}
```

接下来为 `axiosExt` 注册我们的插件。

```js
import { createAxios, createAxiosExt } from '@iel/axios-ext'
import axios from 'axios'
import AutoAddToken from './auto-add-token'

const http = createAxios(axios)
const axiosExt = createAxiosExt(http) // ==> http.$axiosExt

// 为 http 注册插件
axiosExt.use(AutoAddToken)

// 当请求时就会为我们的请求自动带上 token
http.get('/api/list').then(() => {
  // do somethings
})
```

## API 说明

| 名称                       | 描述                                            |
| -------------------------- | ----------------------------------------------- |
| createAxiosExt             | 创建 AxiosExt 实例                              |
| SHALLOW_INSTANCE_KEY       | 浅层拷贝 axios 实例标识                         |
| EVENT_STORE_KEY            | 请求事件数据仓储                                |
| isAxiosInstance            | 判断是否为 axios 实例                           |
| createAxios                | 创建 axios 实例，支持传入配置项和 axios 实例    |
| createShallowAxiosInstance | 创建浅层拷贝 axios 实例                         |
| getFullPath                | 获取请求接口完整地址                            |
| getKeyByConfig             | 根据常用请求配置项序列化生成接口标识            |
| pickConfig                 | 提取常用请求配置项（method、url、data、params） |

## Hook 说明

| 名称            | 描述                                                   |
| --------------- | ------------------------------------------------------ |
| onRequest       | 当请求时执行回调函数，多次调用将依次执行               |
| onResponse      | 当响应成功时执行回调函数，多次调用将依次执行           |
| onResponseError | 当响应失败时执行回调函数，多次调用将依次执行           |
| onFinally       | 当请求流结束时执行回调函数，多次调用将依次执行         |
| onDestroy       | 当 axiosExt 实例销毁时执行回调函数，多次调用将依次执行 |
