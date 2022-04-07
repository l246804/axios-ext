import { http } from '../http'

export const withCache = (forceUpdate = false) => {
  return http.withCache({ expire: 10e3, forceUpdate }).get('/project/component-tree')
}