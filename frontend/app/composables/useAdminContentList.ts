import type {
  AdminContentListMeta,
  AdminContentResource,
} from '~/services/admin-content.service'

/**
 * Admin 内容列表的共享逻辑（Work / Lab 共用）。
 * 使用后端分页 API（不做前端伪分页）：
 * Page → Composable → Service → /api/v1/admin/*。
 */
export function useAdminContentList<TDetail, TListItem>(options: {
  key: string
  /**
   * 列表只需要 `list`；`remove` 可选 —— 只读资源（如联系消息，V1 不做物理删除）
   * 不提供删除能力时，`removeItem` 会明确报错而不是静默失败。
   */
  resource: Pick<AdminContentResource<TDetail, TListItem>, 'list'> &
    Partial<Pick<AdminContentResource<TDetail, TListItem>, 'remove'>>
  /** Experience 没有 status / featured 过滤：传 false 时不发送这两个查询参数 */
  filters?: { status?: boolean; featured?: boolean }
  /** 默认排序（Experience 用 sortOrder asc 对齐 Public 顺序） */
  defaultSort?: string
  defaultOrder?: 'asc' | 'desc'
  /** 默认每页条数（Media Library 用 24） */
  defaultPageSize?: number
  /** 是否发送 sort / order（Media API 不接受这两个参数） */
  sendSort?: boolean
}) {
  const auth = useAuthStore()
  const service = options.resource
  const useStatusFilter = options.filters?.status ?? true
  const useFeaturedFilter = options.filters?.featured ?? true
  const sendSort = options.sendSort ?? true

  const query = reactive({
    page: 1,
    pageSize: options.defaultPageSize ?? 20,
    status: '' as '' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    featured: '' as '' | 'true' | 'false',
    search: '',
    sort: options.defaultSort ?? 'updatedAt',
    order: options.defaultOrder ?? ('desc' as 'asc' | 'desc'),
  })

  const { data, status, error, refresh } = useAsyncData(
    options.key,
    async () => {
      const token = auth.accessToken

      if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      }

      return await service.list(token, {
        page: query.page,
        pageSize: query.pageSize,
        ...(useStatusFilter && query.status ? { status: query.status } : {}),
        ...(useFeaturedFilter && query.featured ? { featured: query.featured } : {}),
        ...(query.search.trim() ? { search: query.search.trim() } : {}),
        ...(sendSort ? { sort: query.sort, order: query.order } : {}),
      })
    },
    { watch: [() => ({ ...query })] },
  )

  const items = computed<TListItem[]>(() => (data.value?.items ?? []) as TListItem[])
  const meta = computed<AdminContentListMeta | null>(() => data.value?.meta ?? null)

  async function removeItem(id: string) {
    const token = auth.accessToken

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    if (!service.remove) {
      throw createError({ statusCode: 405, statusMessage: 'This resource does not support deletion' })
    }

    await service.remove(token, id)
    await refresh()
  }

  function resetFilters() {
    query.status = ''
    query.featured = ''
    query.search = ''
    query.page = 1
  }

  /** 局部更新某一项（PATCH 成功后避免整页重新拉取） */
  function replaceItem(next: TListItem & { id: string }) {
    const current = data.value

    if (!current?.items) {
      return
    }

    data.value = {
      ...current,
      items: (current.items as Array<{ id: string }>).map((item) =>
        item.id === next.id ? next : item,
      ) as TListItem[],
    }
  }

  return { query, items, meta, status, error, refresh, removeItem, resetFilters, replaceItem }
}
