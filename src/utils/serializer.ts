import { each, isArray, isNull, isPlainObject, isString, isUndefined } from '.'

function stringifyParams(resultVal: any, resultKey: string | number, isArr: boolean) {
  let result: string[] = []

  each(resultVal, function (item, key) {
    const _isArr = isArray(item)
    if (isPlainObject(item) || _isArr) {
      result = result.concat(stringifyParams(item, resultKey + '[' + key + ']', _isArr))
    } else {
      result.push(
        encodeURIComponent(resultKey + '[' + (isArr ? '' : key) + ']') +
          '=' +
          encodeURIComponent(isNull(item) ? '' : item)
      )
    }
  })

  return result
}

export const serialize = (obj: any) => {
  let params: string[] = []

  each(obj, (item, key) => {
    if (isUndefined(item)) return

    const isArr = isArray(item)
    if (isPlainObject(item) || isArr) {
      params = params.concat(stringifyParams(item, key, isArr))
    } else {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(isNull(item) ? '' : item))
    }
  })

  return params.join('&').replace(/%20/g, '+')
}

export const deserialize = (str: string) => {
  const result: any = {}

  if (str && isString(str)) {
    each(str.split('&'), (param) => {
      const items = param.split('=')
      result[decodeURIComponent(items[0])] = decodeURIComponent(items[1] ?? '')
    })
  }

  return result
}
