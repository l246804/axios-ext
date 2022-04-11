import { http } from '../http'

export const withCache = (forceUpdate = false) => {
  return http.withCache({ expire: 10e3, forceUpdate }).get('/project/component-tree')
}

export const notAllowRepeat = () => {
  return http.notAllowRepeat().get('/project/component-tree').then(console.log)
}

export const allowRepeat = async () => {
  const res = await http.allowRepeat().get<{ id: string; name: string }>('/project/component-tree')
  const [error, data, cancelType] = res
  console.log(error, data, cancelType)
}
