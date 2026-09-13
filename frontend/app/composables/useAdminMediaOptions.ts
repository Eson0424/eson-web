import type { AdminMediaItem } from '~/services/admin-media.service'

/** 解析已选媒体时的分页大小（= 后端 pageSize 上限） */
const LOOKUP_PAGE_SIZE = 100
/** 解析已选媒体时最多向后翻多少页，避免媒体库很大时无限拉取 */
const LOOKUP_MAX_PAGES = 5

/**
 * 已选媒体的详情缓存（Phase 4-F.5）。
 *
 * Work / Lab / Writing 的 detail 只返回 `coverMediaId` / `mediaIds`（id 列表，按 sort_order）。
 * 渲染缩略图需要 id → 媒体详情，而现有 API 只有分页列表（没有 GET /admin/media/:id），
 * 因此这里用“列表分页 + 有界回填”的方式解析：先取第 1 页，仍缺失的 id 才继续往后翻页。
 *
 * 该实现不新增后端接口；媒体库超过 LOOKUP_PAGE_SIZE × LOOKUP_MAX_PAGES 时，
 * 未解析到的行会退化为只显示 id（见 Phase 4-F.5 known issues）。
 */
export function useAdminMediaOptions() {
  const auth = useAuthStore()
  const service = useAdminMediaService()

  const cache = ref<Record<string, AdminMediaItem>>({})
  const isLoading = ref(false)
  const error = ref(false)

  function remember(items: readonly AdminMediaItem[]) {
    if (items.length === 0) {
      return
    }

    const next = { ...cache.value }

    for (const item of items) {
      next[item.id] = item
    }

    cache.value = next
  }

  function byId(id: string | null | undefined): AdminMediaItem | null {
    return id ? (cache.value[id] ?? null) : null
  }

  function resolve(ids: readonly string[]): Array<AdminMediaItem | null> {
    return ids.map((id) => byId(id))
  }

  /** 拉取第 1 页；`ids` 中仍未缓存的会继续向后翻页（有界） */
  async function ensure(ids: readonly string[] = []): Promise<void> {
    const token = auth.accessToken

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const missing = () => ids.some((id) => !cache.value[id])

    isLoading.value = true
    error.value = false

    try {
      let page = 1
      let totalPages = 1

      do {
        const result = await service.list(token, { page, pageSize: LOOKUP_PAGE_SIZE })

        remember(result.items)
        totalPages = Math.max(1, result.meta.totalPages)
        page += 1
      } while (missing() && page <= totalPages && page <= LOOKUP_MAX_PAGES)
    } catch {
      error.value = true
    } finally {
      isLoading.value = false
    }
  }

  return { byId, resolve, remember, ensure, isLoading, error }
}
