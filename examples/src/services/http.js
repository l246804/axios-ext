import { CacheExtension } from '@iel/axios-extension'
import axios from 'axios'

export const http = axios.create({
  baseURL: '/api'
})

let httpCache

function initExt() {
  if (initExt.installed) return

  initExt.installed = true

  httpCache = new CacheExtension(http, { onError: console.error, transformData: (resp) => resp.data })
}

initExt()

export { httpCache }
