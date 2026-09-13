import { createAdminContentResource, type AdminContentListResult } from './admin-content.service'

/** Admin Media Library 视图（与后端 toAdminMediaView 对齐；不含 storageKey / 磁盘路径） */
export interface AdminMediaItem {
  id: string
  url: string
  filename: string
  originalFilename: string | null
  mimeType: string
  size: number | null
  width: number | null
  height: number | null
  alt: string | null
  provider: string | null
  createdAt: string
  updatedAt: string
}

interface ApiEnvelope<TData> {
  success: boolean
  data: TData
  meta: unknown
}

export interface AdminMediaService {
  list(accessToken: string, query: Record<string, unknown>): Promise<AdminContentListResult<AdminMediaItem>>
  updateAlt(accessToken: string, id: string, alt: string | null): Promise<AdminMediaItem>
  remove(accessToken: string, id: string): Promise<{ id: string; deleted: boolean }>
  upload(accessToken: string, file: File, alt?: string | null): Promise<AdminMediaItem>
}

const UPLOAD_TIMEOUT_MS = 30_000

/**
 * Admin Media API 客户端（Phase 4-F.3 的 API）。
 *
 * - list / PATCH / DELETE 复用共享 JSON 资源工厂（envelope 解包、鉴权头、超时）
 * - multipart 上传单独实现：FormData 不进入通用 JSON resource（4-F 规划的共享层约定）
 */
export function useAdminMediaService(): AdminMediaService {
  const config = useRuntimeConfig()
  const resource = createAdminContentResource<AdminMediaItem, AdminMediaItem>('/admin/media')

  async function updateAlt(accessToken: string, id: string, alt: string | null): Promise<AdminMediaItem> {
    return await resource.update(accessToken, id, { alt })
  }

  async function upload(accessToken: string, file: File, alt?: string | null): Promise<AdminMediaItem> {
    const form = new FormData()

    form.append('file', file)

    const trimmedAlt = typeof alt === 'string' ? alt.trim() : ''

    if (trimmedAlt.length > 0) {
      form.append('alt', trimmedAlt)
    }

    const response = await $fetch<ApiEnvelope<AdminMediaItem>>('/admin/media', {
      baseURL: config.public.apiBase,
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
      timeout: UPLOAD_TIMEOUT_MS,
    })

    return response.data
  }

  return {
    list: (accessToken, query) => resource.list(accessToken, query),
    updateAlt,
    remove: (accessToken, id) => resource.remove(accessToken, id),
    upload,
  }
}
