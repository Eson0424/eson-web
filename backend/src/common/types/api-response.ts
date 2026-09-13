export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiSuccess<TData> {
  success: true
  data: TData
  meta: PaginationMeta | null
}

export interface ApiErrorBody {
  code: string
  message: string
  details: unknown[]
}

export interface ApiErrorEnvelope {
  success: false
  data: null
  error: ApiErrorBody
  meta: null
}

/** 控制器返回该结构时，响应拦截器会原样使用 data / meta */
export interface PaginatedPayload<TItem> {
  data: TItem[]
  meta: PaginationMeta
}
