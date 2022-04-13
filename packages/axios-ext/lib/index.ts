import * as AxiosExt from './AxiosExt'
import * as PluginManager from './PluginManager'
import * as Helper from './helper'
import * as Lifecycle from './lifecycle'

export * from './AxiosExt'
export * from './PluginManager'
export * from './helper'
export * from './lifecycle'

export default {
  ...AxiosExt,
  ...PluginManager,
  ...Helper,
  ...Lifecycle
}
