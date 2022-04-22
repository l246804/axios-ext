import { http } from '../http'

const url = '/demo/list'

export const rawRequest = async () => http(url)

export const request = async () => http.notAllowRepeat()(url)

export const withCache = (forceUpdate = false) => http.withCache({ expire: 10e3, forceUpdate }).get(url)

export const notAllowRepeat = async () => http.notAllowRepeat().get(url)

export const allowRepeat = async () => http.allowRepeat().get(url)

export const responseWrap = async <T = any>() => http.allowRepeat().get<T>(url)

export const retry = async () => http.withRetry({ delay: 3e3, max: 2 }).get(url)
