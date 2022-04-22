import { isFunction, isArray } from './checkType'

export * from './serializer'
export * from './url'
export * from './checkType'
export * from './helperEventStore'

export function assignSafely(target: object = {}, ...sources: any) {
  const onlySource = Object.assign({}, target, ...sources)
  return Object.assign({}, deepCopy(onlySource))
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function bind<T extends Function = any>(fn: T, thisArg?: any): any {
  return function wrapFn() {
    // eslint-disable-next-line prefer-rest-params
    return fn.apply(thisArg, arguments as any)
  }
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 */
export function extend(a: Record<string, any>, b: Record<string, any>, thisArg?: any) {
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
  return function pickOrOmit(obj: any, keys: string[] | ((value: any, key: string | number) => boolean)) {
    const predicate = isFunction(keys) ? keys : (value: any, key: string | number) => keys.includes(key as string)

    return filter(obj, (value, key) => (predicate(value, key) ? case1 : case2))
  }
}

export const pick = helperCreatePickOmit(true, false)

export const omit = helperCreatePickOmit(false, true)

export const deleteKeys = (obj: any, keys: string[]) => keys.forEach((key) => delete obj?.[key])

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {}

export async function sleep(ms = 0) {
  return new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(true), ms)
  })
}

/**
 * Deep copy the given object considering circular structure.
 * This function caches all nested objects and its copies.
 * If it detects circular structure, use cached copy to avoid infinite loop.
 */
 export function deepCopy<T = any>(obj: T, cache: any[] = []): T {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = cache.find((c) => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy: any = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy
  })

  Object.keys(obj).forEach((key) => {
    copy[key] = deepCopy((obj as any)[key], cache)
  })

  return copy
}