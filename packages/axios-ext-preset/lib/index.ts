import { createAxiosExt } from '@iel/axios-ext'
import AxiosExtCache, { AxiosExtCacheOptions } from '@iel/axios-ext-cache'
import AxiosExtCancelRepeat, { AxiosExtCancelRepeatOptions } from '@iel/axios-ext-cancel-repeat'
import AxiosExtLog, { AxiosExtLogOptions } from '@iel/axios-ext-log'
import AxiosExtResponseWrap, { AxiosExtResponseWrapOptions } from '@iel/axios-ext-response-wrap'
import AxiosExtRetry, { AxiosExtRetryOptions } from '@iel/axios-ext-retry'
import { assignSafely, omit } from '@iel/axios-ext-utils'
import { AxiosInstance } from 'axios'

type PresetOptions = {
  /**
   * 预设该插件
   * @default true
   */
  preset?: boolean
}
export type AxiosExtPresetOptions = {
  Cache?: AxiosExtCacheOptions & PresetOptions
  CancelRepeat?: AxiosExtCancelRepeatOptions & PresetOptions
  ResponseWrap?: AxiosExtResponseWrapOptions & PresetOptions
  Retry?: AxiosExtRetryOptions & PresetOptions
  Log?: AxiosExtLogOptions & PresetOptions
}

const getPluginValidOptions = (options: any = {}, defaultOptions: any = {}) => {
  const _options = assignSafely({ preset: true }, defaultOptions, options)
  if (_options.preset) _options.preset = !!_options.preset

  return _options
}

/**
 * 预设 AxiosExt 插件功能
 */
export default function useAxiosExtPreset(instance: AxiosInstance, options: AxiosExtPresetOptions = {}) {
  const _options: Required<AxiosExtPresetOptions> = {
    Cache: getPluginValidOptions(options.Cache, {
      onError: (error: any) => console.error('[AxiosExtCache] - ', error)
    }),
    CancelRepeat: getPluginValidOptions(options.CancelRepeat, { globalNotAllowRepeat: true }),
    ResponseWrap: getPluginValidOptions(options.ResponseWrap, { globalWithResponseWrap: true }),
    Retry: getPluginValidOptions(options.Retry, {
      max: 5,
      onRetrying: (params: any) => {
        console.log(
          `[AxiosExtRetry] - 正在尝试第【${params.num}】次重连!`,
          '\nconfig: ',
          params.config,
          '\nopts: ',
          params.options
        )
      }
    }),
    Log: getPluginValidOptions(options.Log, { globalOnResponse: true })
  }

  const axiosExt = createAxiosExt(instance)

  const usePlugin = (plugin: any, opts: any) => {
    if (!opts.preset) return

    axiosExt.use(plugin, omit(opts, ['preset']))
  }

  usePlugin(AxiosExtRetry, _options.Retry)
  usePlugin(AxiosExtCache, _options.Cache)
  usePlugin(AxiosExtCancelRepeat, _options.CancelRepeat)
  usePlugin(AxiosExtResponseWrap, _options.ResponseWrap)
  usePlugin(AxiosExtLog, _options.Log)

  return axiosExt
}
