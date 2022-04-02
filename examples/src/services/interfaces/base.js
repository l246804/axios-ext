import { http } from '../http'

export const fetchList = () => http.withCache({ expire: 10e3, forceUpdate: true }).get('/project/component-tree')
