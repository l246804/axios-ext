import {
  AxiosExtPlugin,
  ChainShallowAxiosInstance,
  createShallowAxiosInstance,
  EVENT_STORE_KEY,
  OmitChainShallowAxiosInstance,
  onRequest
} from '@iel/axios-ext'
import {
  assignSafely,
  deleteKeys,
  helperCreateEventStoreManager,
  isNullish,
  isSafeInteger,
  sleep
} from '@iel/axios-ext-utils'
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    /**
     * 使用接口重连
     */
    withRetry: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtRetryOptions
    ) => OmitChainShallowAxiosInstance<T, 'withRetry'>
  }
}

export type AxiosExtRetryOptions = {
  /**
   * 最大重连次数
   */
  max?: number
  /**
   * 每次重连间隔延迟
   */
  delay?: number
  /**
   * 重连响应成功时是否需要继续重连
   */
  keepRetryOnSuccess?: (response: AxiosResponse) => boolean
  /**
   * 重连响应成功时，需要继续重连时的错误信息
   */
  getErrorOnSuccess?: (response: AxiosResponse) => any
  /**
   * 重连时执行回调，可通过中断器中断后续请求，返回上次请求结果
   */
  onRetrying?: (params: {
    num: number
    config: AxiosRequestConfig
    options: Readonly<AxiosExtRetryOptions>
    interrupter: () => void
  }) => void
  [K: string]: any
}

const getValidOptions = (options: AxiosExtRetryOptions = {}) => {
  const _options: AxiosExtRetryOptions = assignSafely(options)
  if (!isSafeInteger(_options.max)) _options.max = 3
  if (!isSafeInteger(_options.delay)) _options.delay = undefined

  return _options
}

const evtStoreManager = helperCreateEventStoreManager<AxiosExtRetryOptions>('Retry')

const AxiosExtRetryPlugin: AxiosExtPlugin<AxiosExtRetryOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withRetry: AxiosInstance['withRetry'] = function (args) {
    const shallowInstance = createShallowAxiosInstance(axiosExt, this)

    evtStoreManager.set(shallowInstance[EVENT_STORE_KEY], getValidOptions(assignSafely(baseOptions, args)))
    deleteKeys(shallowInstance, ['withRetry'])

    return shallowInstance as any
  }

  instance.withRetry = withRetry

  onRequest(({ $eventStore, requestFn, setRequestFn }) => {
    const eventStore = evtStoreManager.get($eventStore)

    if (isNullish(eventStore)) return

    setRequestFn((config: any) => {
      let index = 0
      let response: any = null
      let error: any = null
      let isInterrupted = false

      const interrupter = () => {
        isInterrupted = true
      }

      const onError = async (_error: any) => {
        error = _error
        if (!isNullish(eventStore.delay)) {
          await sleep(eventStore.delay)
        }
      }

      return new Promise(async (resolve, reject) => {
        do {
          if (index > 0) {
            eventStore.onRetrying?.({ num: index, config, options: eventStore, interrupter })
          }

          if (isInterrupted) break

          try {
            response = await requestFn(config)

            const valid = eventStore.keepRetryOnSuccess?.(response) ?? false
            if (valid) {
              await onError(eventStore.getErrorOnSuccess?.(response) ?? null)
            } else {
              error = null
              break
            }
          } catch (error: any) {
            await onError(error)
          }
        } while (index++ < eventStore.max!)

        error ? reject(error) : resolve(response)
      })
    })
  })
}

export default AxiosExtRetryPlugin
