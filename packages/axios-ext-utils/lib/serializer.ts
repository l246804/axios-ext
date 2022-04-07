import { forEach, isArray, isNullish, isPlainObject, isString } from '.'

function encode(val = '') {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
}

function stringifyParams(resultVal: any, resultKey: string | number, isArr: boolean) {
  let result: string[] = []

  forEach(resultVal, function (item, key) {
    const _isArr = isArray(item)
    if (isPlainObject(item) || _isArr) {
      result = result.concat(stringifyParams(item, resultKey + '[' + key + ']', _isArr))
    } else {
      result.push(
        encodeURIComponent(resultKey + '[' + (isArr ? '' : key) + ']') +
          '=' +
          encodeURIComponent(isNullish(item) ? '' : item)
      )
    }
  })

  return result
}

export const serialize = (obj: any) => {
  let params: string[] = []

  forEach(obj, (item, key) => {
    if (isNullish(item)) return

    const isArr = isArray(item)
    if (isPlainObject(item) || isArr) {
      params = params.concat(stringifyParams(item, key, isArr))
    } else {
      params.push(encode(key as string) + '=' + encode(isNullish(item) ? '' : item))
    }
  })

  return params.join('&')
}

export const unserialize = (str: string) => {
  const result: any = {}

  if (str && isString(str)) {
    forEach(str.split('&'), (param) => {
      const items = param.split('=')
      result[decodeURIComponent(items[0])] = decodeURIComponent(items[1] ?? '')
    })
  }

  return result
}
