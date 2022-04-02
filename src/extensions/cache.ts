import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { isFunction, pick } from '../utils'
import localforage from 'localforage'
import { serialize } from '../utils/serializer'

export type ProxyAxiosMethodNoData = 'delete' | 'get' | 'head' | 'options'
export type ProxyAxiosMethodWithData = 'post' | 'put' | 'patch'
export type ProxyAxiosMethod = ProxyAxiosMethodNoData | ProxyAxiosMethodWithData
export type ProxyRequestFns = Pick<AxiosInstance, ProxyAxiosMethod>

declare module 'axios' {
  interface AxiosInstance {
    withCache: (args?: CacheArgs) => ProxyRequestFns
  }
}

type CachedRequestConfig = Pick<AxiosRequestConfig, 'method' | 'url' | 'data' | 'params'>

export interface CacheEntity<T = any> {
  key: string
  now: number
  expire: number | null
  config: CachedRequestConfig
  data: T
}

export interface CacheOptions {
  keyGenerator?: (config: AxiosRequestConfig, args: CacheArgs) => string
  isExpired?: (cacheEntity: CacheEntity) => boolean
  allowCache?: (response: any) => boolean
  transformData?: (response: any) => any
  onError?: (error: any, errorType: string, cacheEntity?: CacheEntity) => void
}

export interface CacheArgs extends CacheOptions {
  key?: CacheEntity['key']
  expire?: CacheEntity['expire']
  forceUpdate?: boolean
}

const STORE_NAME = 'AXIOS_EXTENSION_CACHE_STORE'

export const cacheStore = localforage.createInstance({
  name: STORE_NAME,
  description: 'Cache store of axios.'
})

export function dropCacheStore() {
  cacheStore.dropInstance({
    name: STORE_NAME
  })
}

function pickConfig(config: CachedRequestConfig): CachedRequestConfig {
  return pick(config, ['method', 'url', 'data', 'params'])
}

function getCacheKeyByConfig(config: CachedRequestConfig) {
  const { method, url, data = {}, params = {} } = config

  return serialize({ method, url, data, params })
}

function getNow() {
  return Date.now()
}

async function getCacheEntityByKey(key: CacheEntity['key'] = '') {
  return key ? cacheStore.getItem<CacheEntity>(key) : Promise.resolve(null)
}

function isExpired(cacheEntity: CacheEntity) {
  const expireTime = Number.isSafeInteger(cacheEntity.expire) ? cacheEntity.expire : Infinity

  return getNow() - cacheEntity.now >= expireTime!
}

export async function cleanCache() {
  return cacheStore.clear()
}

export async function deleteCache(configOrKey: CacheEntity['key'] | CachedRequestConfig) {
  const key = typeof configOrKey === 'string' ? configOrKey : getCacheKeyByConfig(configOrKey)

  return cacheStore.removeItem(key)
}

export async function deleteCacheBy(
  predicate: (cacheEntity: CacheEntity, key: string, interrupter: () => void) => boolean
) {
  let needsDeleteEntires: string[] = []

  let isInterrupted = false

  const interrupter = () => (isInterrupted = true)

  return cacheStore
    .iterate<CacheEntity, any>((cacheEntity, key) => {
      const valid = predicate?.(cacheEntity, key, interrupter) ?? false

      valid && needsDeleteEntires.push(cacheEntity.key)

      // interrupt iterate
      if (isInterrupted) {
        needsDeleteEntires = [cacheEntity.key]

        return true
      }
    })
    .then(() => Promise.all(needsDeleteEntires.map((key) => deleteCache(key))))
    .catch((error) => error)
}

export async function setCache(cacheEntity: CacheEntity) {
  return cacheStore.setItem(cacheEntity.key, cacheEntity)
}

async function validateCache(args: CacheArgs) {
  let cacheEntity: CacheEntity | null = null

  try {
    cacheEntity = await getCacheEntityByKey(args.key)
  } catch (error) {
    args.onError?.(error, 'validate')
  }

  if (cacheEntity === null) return false

  const expired = args.isExpired?.(cacheEntity) ?? isExpired?.(cacheEntity) ?? true

  if (args.forceUpdate || expired) {
    try {
      await deleteCache(args.key!)
    } catch (error) {
      args.onError?.(error, 'delete', cacheEntity)
      return false
    }
  }

  return true
}

export function useCache(axios: AxiosInstance, options: Partial<CacheOptions> = {}) {
  axios.withCache = function cacheData(args = {}) {
    args = Object.assign({}, options, args)
    args.forceUpdate = !!args.forceUpdate

    if (!isFunction(args.keyGenerator)) {
      args.keyGenerator = undefined
    }
    if (!isFunction(args.isExpired)) {
      args.isExpired = undefined
    }

    const proxyRequestFns: Partial<ProxyRequestFns> = {}

    const proxyRequestFn = async (config: AxiosRequestConfig = {}, rawRequestFn: any) => {
      args.key = args.keyGenerator?.(config, args) || args.key || getCacheKeyByConfig(config)

      try {
        if (await validateCache(args)) {
          const cacheEntity = (await getCacheEntityByKey(args.key))!

          return cacheEntity.data
        }
      } catch (error) {
        args.onError?.(error, 'get')
      }

      return rawRequestFn().then(onResponse.bind(null, args, config)).catch(onResponseError)
    }

    const onResponse = (args: CacheArgs, config: AxiosRequestConfig = {}, response: any) => {
      if (args.allowCache?.(response) ?? true) {
        const cacheEntity = {
          key: args.key!,
          now: getNow(),
          expire: args.expire ?? null,
          data: args.transformData?.(response) ?? response,
          config: pickConfig(config)
        }

        setCache(cacheEntity).catch((error) => args!.onError?.(error, 'set', cacheEntity))
      }

      return response
    }

    const onResponseError = (error: any) => error

    // method no data
    ;(['delete', 'get', 'head', 'options'] as ProxyAxiosMethodNoData[]).forEach((method) => {
      proxyRequestFns[method] = async (url, config) => {
        const _config = { method, url, ...config }

        return proxyRequestFn(_config, () => axios[method](url, config))
      }
    })

    // method with data
    ;(['post', 'put', 'patch'] as ProxyAxiosMethodWithData[]).forEach((method) => {
      proxyRequestFns[method] = async (url, data, config) => {
        const _config = { method, url, data, ...config }

        return proxyRequestFn(_config, () => axios[method](url, data, config))
      }
    })

    return proxyRequestFns as ProxyRequestFns
  }

  return axios
}

export const use = useCache
