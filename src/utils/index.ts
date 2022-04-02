const helperCreatePickOmit = (case1: boolean, case2: boolean) => (obj: any, keys: string[]) =>
  Object.keys(obj ?? {})
    .filter((key) => (keys.includes(key) ? case1 : case2))
    .reduce((newObj, key) => {
      newObj[key] = obj[key]
      return newObj
    }, {} as any)

export const pick = helperCreatePickOmit(true, false)

export const omit = helperCreatePickOmit(false, true)

export const toString = (context: any) => Object.prototype.toString.call(context).slice(8, -1)

export const isNull = (value: any): value is null => toString(value) === 'Null'

export const isUndefined = (value: any): value is undefined => toString(value) === 'Undefined'

export const isPlainObject = (value: any): value is object => toString(value) === 'Object'

export const isArray = (value: any): value is any[] => Array.isArray(value)

export const isString = (value: any): value is string => toString(value) === 'String'

export const isFunction = (value: any): value is () => any => toString(value) === 'Function'

export type Nullish = null | undefined
export const isNullish = (value: any): value is Nullish => isNull(value) || isUndefined(value)

export const each = (obj: any, callback: (value: any, key: string | number, context: any) => void) => {
  Object.keys(obj ?? {}).forEach((key) => {
    callback?.(obj[key], key, obj)
  })
}

export function assignSafely(target: object = {}, ...sources: any[]) {
  return Object.assign({}, target, ...sources)
}