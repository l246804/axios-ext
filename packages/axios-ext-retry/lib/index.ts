import { AxiosExtPlugin, ChainShallowAxiosInstance, OmitChainShallowAxiosInstance } from '@iel/axios-ext'
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
    withRetry: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtRetryOptions
    ) => OmitChainShallowAxiosInstance<T, 'withRetry'>
  }
}

export type AxiosExtRetryOptions = {
  max?: number
  delay?: number
  keepRetryOnSuccess?: (response: AxiosResponse) => boolean
  getErrorOnSuccess?: (response: AxiosResponse) => any
  onRetrying?: (config: AxiosRequestConfig, options: Readonly<AxiosExtRetryOptions>) => void
  [K: string]: any
}

const getValidOptions = (options: AxiosExtRetryOptions = {}) => {
  const _options: AxiosExtRetryOptions = assignSafely(options)
  if (!isSafeInteger(_options.max)) _options.max = 3
  if (!isSafeInteger(_options.delay)) _options.delay = undefined

  return _options
}

const evtStoreManager = helperCreateEventStoreManager<AxiosExtRetryOptions>('Retry')

const useAxiosExtRetry: AxiosExtPlugin<AxiosExtRetryOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withRetry: AxiosInstance['withRetry'] = function (args) {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)

    evtStoreManager.set(shallowInstance.$eventStore, getValidOptions(assignSafely(baseOptions, args)))
    deleteKeys(shallowInstance, ['withRetry'])

    return shallowInstance as any
  }

  instance.withRetry = withRetry

  return {
    onRequest: ({ $eventStore, requestFn, setRequestFn }) => {
      const eventStore = evtStoreManager.get($eventStore)

      if (isNullish(eventStore)) return

      setRequestFn((config: any) => {
        let index = 0
        let response: any = null
        let error: any = null

        const onError = async (_error: any) => {
          error = _error
          if (!isNullish(eventStore.delay)) {
            await sleep(eventStore.delay)
          }
        }

        return new Promise(async (resolve, reject) => {
          do {
            if (index > 0) {
              eventStore.onRetrying?.(config, baseOptions)
            }

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
    }
  }
}

export default useAxiosExtRetry
