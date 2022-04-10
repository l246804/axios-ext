import { Nullish } from './checkType'

const PREFIX = '$$EVENT_STORE__'
let id = 0

export function helperCreateEventStoreManager<T = any>(name = '') {
  id += 1

  let key = PREFIX + id
  if (name) {
    key += `__${name}`
  }

  const get = (eventStore: any) => {
    return eventStore?.[key] as T | Nullish
  }

  const set = (eventStore: any = {}, data: T) => {
    eventStore[key] = data
    return data
  }

  return {
    get,
    set
  }
}
