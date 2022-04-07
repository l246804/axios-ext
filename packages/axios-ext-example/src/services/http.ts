import useAxiosExt from '@iel/axios-ext'
import AxiosExtCache from '@iel/axios-ext-cache'
import axios from 'axios'

export const http = axios.create({
  baseURL: '/api',
  timeout: 5000
})

function initExts() {
  useAxiosExt(http).use(AxiosExtCache, {
    onError: console.error,
    allowCache: (response, args) => {
      console.log('allowCache', response, args)
      return true
    }
  })
}

initExts()
