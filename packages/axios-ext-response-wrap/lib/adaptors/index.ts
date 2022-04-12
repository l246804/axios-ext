export { default as ErrorAdaptor } from './error'
export { default as SuccessAdaptor } from './success'

export type AxiosResponseAdaptor = (responseData: any) => {
  isAdaption: boolean
  result: {
    error: boolean
    data: any
    message: string
  }
}
