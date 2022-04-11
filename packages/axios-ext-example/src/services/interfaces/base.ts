import { http } from '../http'

export const withCache = (forceUpdate = false) => {
  return http.withCache({ expire: 10e3, forceUpdate }).get('/project/component-tree')
}

export const notAllowRepeat = () => {
  return http.notAllowRepeat().get('/project/component-tree').then(console.log)
}

export const allowRepeat = async () =>
  http.withLog({ enableOnRequest: false }).allowRepeat().get('/project/component-tree')
