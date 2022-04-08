import { Nullish } from './checkType'

const PREFIX = '$$EVENT_STORE__'
let id = 0

export function helperCreateEventStoreManager<T = any>(name = '') {
  if (!name) {
    id += 1
    name = PREFIX + id
  }

  const get = (eventStore: any) => {
    return eventStore?.[name] as T | Nullish
  }

  const set = (eventStore: any = {}, data: T) => {
    eventStore[name] = data
    return data
  }

  return {
    get,
    set
  }
}
