import { AxiosInstance } from 'axios';
import CacheExtension from './extensions/cache'
import CancelRepeatExtension from './extensions/cancelRepeat'

export {
  CacheExtension,
  CancelRepeatExtension
}

export default function extendAxios(axios: AxiosInstance) {
  const cacheExt = new CacheExtension(axios)
  const cancelRepeatExt = new CancelRepeatExtension(axios)

  return {
    cacheExt,
    cancelRepeatExt
  }
}
