import type { AdminContentDetailLike } from '~/utils/content-form'

/**
 * Admin 内容 API 客户端工厂（Work / Lab 共用）。
 *
 * 只负责：Base URL、Authorization、envelope 解包（docs/API.md §5）与超时。
 * 资源路径由调用方给出（/admin/works、/admin/labs ...），组件不直接 fetch（AGENTS §38）。
 */

export interface AdminContentListItem {
  id: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  featured: boolean
  title: string
  locale: string
  translationStatus: Record<string, boolean>
  missingLocales: string[]
  categories: Array<{ id: string; slug: string; name: string }>
  tags: Array<{ id: string; slug: string; name: string }>
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminContentListMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AdminContentListResult<TListItem = AdminContentListItem> {
  items: TListItem[]
  meta: AdminContentListMeta
}

export interface AdminContentDetailBase extends AdminContentDetailLike {
  id: string
  cover?: { src: string; alt: string } | null
  createdAt: string
  updatedAt: string
}

interface ApiEnvelope<TData> {
  success: boolean
  data: TData
  meta: unknown
}

export interface AdminContentResource<TDetail, TListItem = AdminContentListItem> {
  list(accessToken: string, query: Record<string, unknown>): Promise<AdminContentListResult<TListItem>>
  detail(accessToken: string, id: string): Promise<TDetail>
  create(accessToken: string, payload: Record<string, unknown>): Promise<TDetail>
  update(accessToken: string, id: string, payload: Record<string, unknown>): Promise<TDetail>
  remove(accessToken: string, id: string): Promise<{ id: string; deleted: boolean }>
}

const REQUEST_TIMEOUT_MS = 10_000

function toListMeta(meta: unknown, itemCount: number): AdminContentListMeta {
  const candidate = meta as Partial<AdminContentListMeta> | null | undefined

  if (candidate && typeof candidate.total === 'number' && typeof candidate.totalPages === 'number') {
    return {
      page: candidate.page ?? 1,
      pageSize: candidate.pageSize ?? itemCount,
      total: candidate.total,
      totalPages: candidate.totalPages,
    }
  }

  return { page: 1, pageSize: itemCount, total: itemCount, totalPages: 1 }
}

/**
 * 资源客户端的真实实现；Work / Lab / Writing / Experience 的 service 都是它的薄封装。
 * `TListItem` 默认是内容型列表项（slug/status/featured），Experience 传入自己的列表项类型。
 */
export function createAdminContentResource<TDetail, TListItem = AdminContentListItem>(
  path: string,
): AdminContentResource<TDetail, TListItem> {
  const config = useRuntimeConfig()

  function authHeaders(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` }
  }

  async function list(
    accessToken: string,
    query: Record<string, unknown>,
  ): Promise<AdminContentListResult<TListItem>> {
    const response = await $fetch<ApiEnvelope<TListItem[]>>(path, {
      baseURL: config.public.apiBase,
      headers: authHeaders(accessToken),
      query,
      timeout: REQUEST_TIMEOUT_MS,
    })
    const items = Array.isArray(response.data) ? response.data : []

    return { items, meta: toListMeta(response.meta, items.length) }
  }

  async function detail(accessToken: string, id: string): Promise<TDetail> {
    const response = await $fetch<ApiEnvelope<TDetail>>(`${path}/${id}`, {
      baseURL: config.public.apiBase,
      headers: authHeaders(accessToken),
      timeout: REQUEST_TIMEOUT_MS,
    })

    return response.data
  }

  async function create(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<TDetail> {
    const response = await $fetch<ApiEnvelope<TDetail>>(path, {
      baseURL: config.public.apiBase,
      method: 'POST',
      headers: authHeaders(accessToken),
      body: payload,
      timeout: REQUEST_TIMEOUT_MS,
    })

    return response.data
  }

  async function update(
    accessToken: string,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<TDetail> {
    const response = await $fetch<ApiEnvelope<TDetail>>(`${path}/${id}`, {
      baseURL: config.public.apiBase,
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: payload,
      timeout: REQUEST_TIMEOUT_MS,
    })

    return response.data
  }

  async function remove(accessToken: string, id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await $fetch<ApiEnvelope<{ id: string; deleted: boolean }>>(`${path}/${id}`, {
      baseURL: config.public.apiBase,
      method: 'DELETE',
      headers: authHeaders(accessToken),
      timeout: REQUEST_TIMEOUT_MS,
    })

    return response.data
  }

  return { list, detail, create, update, remove }
}

/** Work / Lab 编辑所需的只读引用数据（categories / tags / media） */
export function useAdminReferenceService() {
  const config = useRuntimeConfig()

  async function fetchOptions<TItem>(accessToken: string, path: string): Promise<TItem[]> {
    const response = await $fetch<ApiEnvelope<TItem[]>>(path, {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: REQUEST_TIMEOUT_MS,
    })

    return Array.isArray(response.data) ? response.data : []
  }

  return { fetchOptions }
}
