import { AxiosInstance, AxiosRequestConfig } from 'axios'
import localforage from 'localforage'
import { assignSafely, isFunction, pick } from '../utils'
import { serialize } from '../utils/serializer'
import { staticResolve, staticReject } from '../utils/promise'
import BaseExtension from './base'

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
  storeName?: string
  configStore?: (store: LocalForage) => void
  keyGenerator?: (config: AxiosRequestConfig, args: CacheArgs) => CacheEntity['key']
  isExpired?: (entity: CacheEntity) => boolean
  allowCache?: (response: any) => boolean
  transformData?: (response: any) => any
  onError?: (error: any) => void
}

export interface CacheArgs extends CacheOptions {
  key?: CacheEntity['key']
  expire?: CacheEntity['expire']
  forceUpdate?: boolean
}

class CacheExtension extends BaseExtension {
  static DB_NAME = 'AXIOS_EXTENSION_CACHE_DB'
  static STORE_NAME = 'AXIOS_EXTENSION_CACHE_STORE'
  static STORE_DESCRIPTION = 'Cache store of axios.'

  static PROXY_AXIOS_METHOD_NO_DATA: ProxyAxiosMethodNoData[] = ['delete', 'get', 'head', 'options']
  static PROXY_AXIOS_METHOD_WITH_DATA: ProxyAxiosMethodWithData[] = ['post', 'put', 'patch']

  baseOptions: CacheOptions
  store?: LocalForage
  storeOptions!: LocalForageOptions

  constructor(axiosInstance: AxiosInstance, options: CacheOptions = {}) {
    super(axiosInstance)
    this.baseOptions = options

    this.createStore()
    this.init()
  }

  destroy() {
    this.dropStore()
  }

  createStore() {
    this.storeOptions = {
      name: CacheExtension.DB_NAME,
      storeName: this.baseOptions.storeName || CacheExtension.STORE_NAME,
      description: CacheExtension.STORE_DESCRIPTION
    }

    this.store = localforage.createInstance(this.storeOptions)

    this.baseOptions.configStore?.(this.store)
  }

  dropStore() {
    this.clean()
    this.store?.dropInstance(this.storeOptions)

    this.store = undefined
  }

  private async init() {
    this.axiosInstance.withCache = (args) => {
      const _args: CacheArgs = assignSafely(args, this.baseOptions)
      _args.forceUpdate = !!_args.forceUpdate

      if (!isFunction(_args.keyGenerator)) {
        _args.keyGenerator = undefined
      }
      if (!isFunction(_args.isExpired)) {
        _args.isExpired = undefined
      }

      const proxyRequestFns: Partial<ProxyRequestFns> = {}

      const proxyRequestFn = async (config: AxiosRequestConfig = {}, rawRequestFn: any) => {
        _args.key = _args.keyGenerator?.(config, _args) || _args.key || this.getKeyByConfig(config)

        try {
          if (await this.validate(_args)) {
            const entity = (await this.get(_args.key))!

            return entity.data
          }
        } catch (error) {
          _args.onError?.(error)
        }

        return rawRequestFn().then(this.onResponse.bind(this, _args, config)).catch(staticReject)
      }

      CacheExtension.PROXY_AXIOS_METHOD_NO_DATA.forEach((method) => {
        proxyRequestFns[method] = async (url, config) => {
          const _config = { method, url, ...config }

          return proxyRequestFn(_config, () => this.axiosInstance[method](url, config))
        }
      })

      CacheExtension.PROXY_AXIOS_METHOD_WITH_DATA.forEach((method) => {
        proxyRequestFns[method] = async (url, data, config) => {
          const _config = { method, url, data, ...config }

          return proxyRequestFn(_config, () => this.axiosInstance[method](url, data, config))
        }
      })

      return proxyRequestFns as ProxyRequestFns
    }
  }

  private onResponse(args: CacheArgs, config: AxiosRequestConfig, response: any) {
    if (args.allowCache?.(response) ?? true) {
      const entity = {
        key: args.key!,
        now: this.getNow(),
        expire: args.expire ?? null,
        data: args.transformData?.(response) ?? response,
        config: this.pickConfig(config)
      }

      this.set(entity).catch((error) => args.onError?.(error))
    }

    return response
  }

  async get(key: CacheEntity['key'] = '') {
    return key ? this.store?.getItem<CacheEntity>(key) : staticResolve(null)
  }

  async set(entity: CacheEntity) {
    if (!entity?.key) return

    return this.store?.setItem(entity.key, entity)
  }

  async delete(configOrKey: CacheEntity['key'] | CachedRequestConfig) {
    const key = typeof configOrKey === 'string' ? configOrKey : this.getKeyByConfig(configOrKey)

    return this.store?.removeItem(key)
  }

  async deleteBy(predicate: (entity: CacheEntity, key: string, interrupter: () => void) => boolean) {
    let needsDeleteEntires: string[] = []

    let isInterrupted = false

    const interrupter = () => (isInterrupted = true)

    return this.store
      ?.iterate<CacheEntity, any>((entity, key) => {
        const valid = predicate?.(entity, key, interrupter) ?? false

        valid && needsDeleteEntires.push(entity.key)

        // interrupt iterate
        if (isInterrupted) {
          needsDeleteEntires = [entity.key]

          return true
        }
      })
      .then(() => Promise.all(needsDeleteEntires.map((key) => this.delete(key))))
      .catch(staticReject)
  }

  async clean() {
    return this.store?.clear()
  }

  async validate(args: CacheArgs) {
    let entity: CacheEntity | null = null

    try {
      entity = await this.get(args.key)
    } catch (error) {
      args.onError?.(error)
    }

    if (entity === null) return false

    const expired = args.isExpired?.(entity) ?? this.isExpired?.(entity) ?? true

    if (args.forceUpdate || expired) {
      try {
        await this.delete(args.key!)
      } catch (error) {
        args.onError?.(error)
      }
      return false
    }

    return true
  }

  isExpired(entity: CacheEntity) {
    const expireTime = Number.isSafeInteger(entity.expire) ? entity.expire : Infinity

    return this.getNow() - entity.now >= expireTime!
  }

  getNow() {
    return Date.now()
  }

  getKeyByConfig(config: AxiosRequestConfig = {}) {
    const { method, url, data = {}, params = {} } = config

    return serialize({ method, url: this.getUrlByConfig({ url }), data, params })
  }

  pickConfig(config: AxiosRequestConfig): CachedRequestConfig {
    return pick(config, ['method', 'url', 'data', 'params'])
  }
}

export default CacheExtension
