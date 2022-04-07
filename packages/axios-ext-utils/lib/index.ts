import { isFunction, isArray } from './check-type'

export * from './serializer'
export * from './url'
export * from './check-type'

export function assignSafly(target: object = {}, ...sources: any) {
  return Object.assign({}, target, ...sources)
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function bind<T extends Function = any>(fn: T, thisArg?: any): any {
  return function wrap() {
    // eslint-disable-next-line prefer-rest-params
    return fn.apply(thisArg, arguments as any)
  }
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 */
export function extend(a: Record<string, any>, b: Record<string, any>, thisArg: any) {
  forEach(b, function (value, key) {
    if (thisArg && isFunction(value)) {
      a[key] = bind(value, thisArg)
    } else {
      a[key] = value
    }
  })
  return a
}

export function invoke(obj: any, method: string, ...args: any) {
  // eslint-disable-next-line prefer-spread
  return isFunction(obj?.[method]) ? obj[method].apply(obj, args) : undefined
}

function helperCreateArrayMethods(
  method: string,
  obj: any,
  iter: (value: any, key: string | number, obj: object) => void
) {
  const isArr = isArray(obj)
  const objOfIter = isArr ? obj : Object.keys(obj ?? {})
  const _iter = isArr ? iter : (key: string) => iter(obj[key], key, obj)

  return invoke(objOfIter, method, _iter)
}

export function forEach(obj: any, iter: (value: any, key: string | number, obj: object) => void) {
  return helperCreateArrayMethods('forEach', obj, iter)
}

export function filter(obj: any, iter: (value: any, key: string | number, obj: object) => void) {
  const result: any[] = helperCreateArrayMethods('filter', obj, iter)

  if (isArray(obj)) return result

  return result.reduce((newObj, key) => {
    newObj[key] = obj[key]
    return newObj
  }, {} as any)
}

function helperCreatePickOmit(case1: boolean, case2: boolean) {
  return function pickOrOmit(obj: any, keys: string[]) {
    return filter(obj, (value, key) => (keys.includes(key as string) ? case1 : case2))
  }
}

export const pick = helperCreatePickOmit(true, false)

export const omit = helperCreatePickOmit(false, true)

export const deleteKeys = (obj: any, keys: string[]) => keys.forEach((key) => delete obj?.[key])

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {}
