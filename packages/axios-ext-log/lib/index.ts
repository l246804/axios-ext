import { AxiosExtPlugin, ChainShallowAxiosInstance, OmitChainShallowAxiosInstance } from '@iel/axios-ext'
import { assignSafely, deleteKeys, helperCreateEventStoreManager, isBoolean, isPromise } from '@iel/axios-ext-utils'
import { AxiosInstance } from 'axios'

declare module 'axios' {
  interface AxiosInstance {
    withLog: <T = ChainShallowAxiosInstance>(
      this: T,
      args?: AxiosExtLogArgs
    ) => OmitChainShallowAxiosInstance<T, 'withLog'>
  }
}

export type AxiosExtLogOptions = {
  /**
   * @default false
   */
  globalOnRequest?: boolean
  /**
   * @default false
   */
  globalOnResponse?: boolean
  [K: string]: any
}

export type AxiosExtLogArgs = {
  /**
   * @default true
   */
  enableOnRequest?: boolean
  /**
   * @default true
   */
  enableOnResponse?: boolean
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
    { enableOnRequest: options.globalOnRequest, enableOnResponse: options.globalOnResponse },
    args
  )

  if (!isBoolean(_args.enableOnRequest)) _args.enableOnRequest = !!_args.enableOnRequest
  if (!isBoolean(_args.enableOnResponse)) _args.enableOnResponse = !!_args.enableOnResponse

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

const useAxiosExtLog: AxiosExtPlugin<AxiosExtLogOptions> = function (axiosExt, options) {
  const baseOptions = getValidOptions(options)
  const instance = axiosExt.instance

  const withLog: AxiosInstance['withLog'] = function (args) {
    const shallowInstance = axiosExt.createShallowAxiosInstance(this)

    evtStoreManager.set(shallowInstance.$eventStore, getValidArgs(args, options))
    deleteKeys(shallowInstance, ['withLog'])

    return shallowInstance as any
  }

  instance.withLog = withLog

  return {
    onRequest: ({ $eventStore, config }) => {
      const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

      if (!eventStore.enableOnRequest) return

      log('request', { $eventStore, config })
    },
    onResponseFinally: async ({ $eventStore, isError, returnValue, config }) => {
      const eventStore = evtStoreManager.get($eventStore) ?? getValidArgs({}, baseOptions)

      if (!eventStore.enableOnResponse) return

      if (isPromise(returnValue)) {
        returnValue = await returnValue.catch((error) => {
          isError = true
          return Promise.resolve(error)
        })
      }

      log('response', { $eventStore, returnValue, config }, isError)
    }
  }
}

export default useAxiosExtLog
