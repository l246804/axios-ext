import {
  AxiosExtPlugin,
  ChainShallowAxiosInstance,
  createShallowAxiosInstance,
  EVENT_STORE_KEY,
  OmitChainShallowAxiosInstance,
  onFinally,
  onRequest
} from '@iel/axios-ext'
import { assignSafely, deleteKeys, helperCreateEventStoreManager, isBoolean, isPromise } from '@iel/axios-ext-utils'
import { AxiosInstance } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    /**
     * 输出阶段信息
     */
    withLog: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtLogArgs
    ) => OmitChainShallowAxiosInstance<T, 'withLog'>
  }
}

export type AxiosExtLogOptions = {
  /**
   * 是否全局默认输出请求信息
   *
   * @default false
   */
  globalOnRequest?: boolean
  /**
   * 是否全局默认输出响应信息
   *
   * @default false
   */
  globalOnResponse?: boolean
  [K: string]: any
}

export type AxiosExtLogArgs = {
  /**
   * 是否输出请求信息
   *
   * @default true
   */
  onRequest?: boolean
  /**
   * 是否输出响应信息
   *
   * @default true
   */
  onResponse?: boolean
  [K: string]: any
}

const evtStoreManager = helperCreateEventStoreManager<Required<AxiosExtLogArgs>>('Log')

const getValidOptions = (options: AxiosExtLogOptions = {}) => {
  const _options: AxiosExtLogOptions = assignSafely(options)
  if (!isBoolean(_options.globalOnRequest)) _options.globalOnRequest = !!_options.globalOnRequest
  if (!isBoolean(_options.globalOnResponse)) _options.globalOnResponse = !!_options.globalOnResponse

  return _options
}

const getValidArgs = (args: AxiosExtLogArgs = {}, options: AxiosExtLogOptions = {}) => {
  const _args: Required<AxiosExtLogArgs> = assignSafely(
    { onRequest: options.globalOnRequest ?? true, onResponse: options.globalOnResponse ?? true },
    args
  )

  if (!isBoolean(_args.onRequest)) _args.onRequest = !!_args.onRequest
  if (!isBoolean(_args.onResponse)) _args.onResponse = !!_args.onResponse

  return _args
}

const log = (prefix: string, obj: any, isError = false) => {
  const color = isError ? '#f03f14' : '#2d8cf0'

  console.log(
    `%c [AxiosExtLog] %c ${prefix} %c`,
    `background:${color};border:1px solid ${color}; padding: 1px; border-radius: 4px 0 0 4px; color: #fff;`,
    `border:1px solid ${color}; padding: 1px; border-radius: 0 4px 4px 0; color: ${color};`,
    `background:transparent;`,
    '\n',
    obj
  )
}

const AxiosExtLogPlugin: AxiosExtPlugin<AxiosExtLogOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withLog: AxiosInstance['withLog'] = function (args) {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)

    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], getValidArgs(args, options))
    deleteKeys(shallowInstance, ['withLog'])

    return shallowInstance as any
  }

  instance.withLog = withLog

  onRequest(({ $eventStore, config }) => {
    const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

    if (!eventStore.onRequest) return

    log('request', { $eventStore, config })
  })

  onFinally(async ({ $eventStore, isError, returnValue, config }) => {
    const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

    if (!eventStore.onResponse) return

    if (isPromise(returnValue)) {
      returnValue = await returnValue.catch((error) => {
        isError = true
        return Promise.resolve(error)
      })
    }

    log('response', { $eventStore, returnValue, config }, isError)
  })
}

export default AxiosExtLogPlugin
