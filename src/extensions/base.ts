import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { combineURLs } from '../utils/url'

class BaseExtension {
  axiosInstance: AxiosInstance

  constructor(axios: AxiosInstance) {
    if (!(axios instanceof Axios.constructor)) {
      throw Error("The axios of parameter must be a Axios's instance.")
    }

    this.axiosInstance = axios
  }

  getUrlByConfig(config: AxiosRequestConfig) {
    return combineURLs(this.axiosInstance.defaults.baseURL, config.url)
  }
}

export default BaseExtension
