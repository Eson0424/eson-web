/**
 * 统一 API client（AGENTS §38）。
 * 页面与组件不直接调用 fetch：所有请求都经过 services/*，统一处理
 * Base URL、Response envelope、错误码与超时。
 */

export interface ApiErrorPayload {
  code: string
  message: string
  details: unknown[]
}

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: unknown[] = [],
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

interface ApiEnvelope<TData> {
  success: boolean
  data: TData
  meta: unknown
}

interface ApiErrorEnvelope {
  success: false
  error: ApiErrorPayload
}

const REQUEST_TIMEOUT_MS = 10_000

export function useApiClient() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  async function request<TData>(
    path: string,
    options: { query?: Record<string, unknown> } = {},
  ): Promise<TData> {
    try {
      const response = await $fetch<ApiEnvelope<TData>>(path, {
        baseURL,
        method: 'GET',
        query: options.query,
        timeout: REQUEST_TIMEOUT_MS,
      })

      return response.data
    } catch (error) {
      throw toApiError(error)
    }
  }

  return { request, baseURL }
}

export function toApiError(error: unknown): ApiRequestError {
  const candidate = error as {
    statusCode?: number
    response?: { status?: number; _data?: ApiErrorEnvelope }
    data?: ApiErrorEnvelope
  }
  const status = candidate.statusCode ?? candidate.response?.status ?? 0
  const payload = candidate.data ?? candidate.response?._data

  if (payload?.error) {
    return new ApiRequestError(payload.error.code, payload.error.message, status, payload.error.details)
  }

  return new ApiRequestError(
    status === 0 ? 'NETWORK_ERROR' : 'INTERNAL_ERROR',
    status === 0 ? 'The API is unreachable' : 'The API returned an unexpected error',
    status,
  )
}
