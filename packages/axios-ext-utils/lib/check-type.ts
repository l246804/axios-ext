export function toString(obj: any) {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

export function isFunction(value: any): value is (...args: any) => any {
  return value && typeof value === 'function'
}

export function isString(value: any): value is string {
  return toString(value) === 'String'
}

export function isBoolean(value: any): value is boolean {
  return toString(value) === 'Boolean'
}

export function isNumber(value: any): value is number {
  return toString(value) === 'Number'
}

export function isDate(value: any): value is Date {
  return toString(value) === 'Date'
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}

export function isObject(value: any): value is object {
  return value && typeof value === 'object'
}

export function isPlainObject(value: any): value is Record<string, any> {
  return toString(value) === 'Object'
}

export function isNull(value: any): value is null {
  return toString(value) === 'Null'
}

export function isUndefined(value: any): value is undefined {
  return toString(value) === 'Undefined'
}

export type Nullish = null | undefined
export function isNullish(value: any): value is Nullish {
  return isNull(value) || isUndefined(value)
}

export function isURLSearchParams(value: any) {
  return toString(value) === 'URLSearchParams'
}

export function isSafeInteger(value: any) {
  return Number.isSafeInteger(value)
}

export function isPromise(value: any): value is Promise<any> {
  return toString(value) === 'Promise'
}