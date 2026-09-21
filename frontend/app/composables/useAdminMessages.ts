import type { AdminContactMessage, ContactMessageStatus } from '~/services/admin-message.service'

/** Admin 收件箱每页条数（消息正文较长，比其他内容列表更小） */
export const MESSAGE_PAGE_SIZE = 20

/** 状态筛选选项；空字符串表示"全部"（不发送 status 参数） */
export const MESSAGE_STATUS_FILTERS = ['', 'UNREAD', 'READ', 'ARCHIVED'] as const
export type MessageStatusFilter = (typeof MESSAGE_STATUS_FILTERS)[number]

/**
 * Admin Messages 页面级状态与动作。
 *
 * 数据流：Page → Composable → Service → /api/v1/admin/messages（docs/API.md §18）。
 * 排序交给后端默认值（UNREAD 优先 + createdAt DESC），因此不发送 sort / order。
 */
export function useAdminMessages() {
  const auth = useAuthStore()
  const service = useAdminMessageService()

  const list = useAdminContentList<AdminContactMessage, AdminContactMessage>({
    key: 'admin-messages',
    resource: service,
    filters: { featured: false },
    sendSort: false,
    defaultPageSize: MESSAGE_PAGE_SIZE,
  })

  const selectedId = ref<string | null>(null)
  const selected = computed<AdminContactMessage | null>(
    () => list.items.value.find((item) => item.id === selectedId.value) ?? null,
  )

  const isUpdating = ref(false)
  const updateErrorKey = ref<string | null>(null)

  /**
   * `useAdminContentList` 的 status 字段按内容状态（DRAFT/PUBLISHED/ARCHIVED）定义，
   * 消息有自己的一套枚举，这里收窄成消息状态，避免把内容状态传进消息接口。
   */
  const query = list.query as Omit<typeof list.query, 'status'> & { status: MessageStatusFilter }

  // 列表刷新/翻页后保持选择有效；否则自动选中第一条，避免详情区空着。
  watch(
    () => list.items.value.map((item) => item.id).join(','),
    () => {
      const isStillVisible = list.items.value.some((item) => item.id === selectedId.value)

      if (!isStillVisible) {
        selectedId.value = list.items.value[0]?.id ?? null
      }
    },
    { immediate: true },
  )

  function setFilter(value: MessageStatusFilter) {
    query.status = value
    query.page = 1
  }

  async function setStatus(status: ContactMessageStatus): Promise<boolean> {
    const message = selected.value

    if (!message || isUpdating.value) {
      return false
    }

    const token = auth.accessToken

    if (!token) {
      updateErrorKey.value = 'admin.messages.sessionExpired'
      return false
    }

    isUpdating.value = true
    updateErrorKey.value = null

    try {
      const updated = await service.updateStatus(token, message.id, status)

      list.replaceItem(updated)

      return true
    } catch (error) {
      // 401 → 明确提示重新登录；其余（404 / 网络 / 500）统一提示重试。
      updateErrorKey.value = isUnauthorized(error)
        ? 'admin.messages.sessionExpired'
        : 'admin.messages.updateError'

      return false
    } finally {
      isUpdating.value = false
    }
  }

  return {
    query,
    items: list.items,
    meta: list.meta,
    status: list.status,
    error: list.error,
    refresh: list.refresh,
    selectedId,
    selected,
    isUpdating,
    updateErrorKey,
    setFilter,
    setStatus,
  }
}

/** ApiRequestError 携带后端 envelope 的 status（app/services/api.ts） */
function isUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'status' in error && error.status === 401)
}
