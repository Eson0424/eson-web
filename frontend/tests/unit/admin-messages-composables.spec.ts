import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_PAGE_SIZE, useAdminMessages } from '~/composables/useAdminMessages'
import { useAdminContentList } from '~/composables/useAdminContentList'
import type { AdminContactMessage } from '~/services/admin-message.service'

// 上线前 P0 修复：/admin/messages 的可测试逻辑（列表 / 筛选 / 选中 / 状态流转）。
// 复用真实的 useAdminContentList，只替换 auth / service / useAsyncData。

const auth = { accessToken: 'test-token' as string | null }
const service = {
  list: vi.fn(),
  updateStatus: vi.fn(),
}

let asyncData: {
  data: ReturnType<typeof ref>
  status: ReturnType<typeof ref>
  run: () => Promise<void>
}

let watchers: Array<() => void> = []

function message(overrides: Partial<AdminContactMessage> = {}): AdminContactMessage {
  return {
    id: 'm1',
    name: 'Visitor',
    email: 'visitor@example.com',
    subject: 'Project enquiry',
    message: 'Message body.',
    status: 'UNREAD',
    createdAt: '2026-09-20T02:00:00.000Z',
    updatedAt: '2026-09-20T02:00:00.000Z',
    ...overrides,
  }
}

function page(items: AdminContactMessage[], total = items.length, totalPages = 1) {
  return { items, meta: { page: 1, pageSize: MESSAGE_PAGE_SIZE, total, totalPages } }
}

function stubGlobals() {
  watchers = []

  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('watch', (_source: unknown, callback: () => void, options?: { immediate?: boolean }) => {
    watchers.push(callback)

    if (options?.immediate) {
      callback()
    }

    return () => {}
  })
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminMessageService', () => service)
  vi.stubGlobal('useAdminContentList', useAdminContentList)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('useAsyncData', (_key: string, handler: () => Promise<unknown>) => {
    const data = ref<unknown>(null)
    const status = ref<string>('idle')
    const error = ref<unknown>(null)
    const run = async () => {
      status.value = 'pending'

      try {
        data.value = await handler()
        status.value = 'success'
        error.value = null
      } catch (requestError) {
        error.value = requestError
        status.value = 'error'
      }
    }

    asyncData = { data, status, run }

    return { data, status, error, refresh: run }
  })
}

/** 模拟 Vue 的响应式 watcher 在一次数据变更后重新求值 */
function flushWatchers() {
  for (const callback of watchers) {
    callback()
  }
}

beforeEach(() => {
  auth.accessToken = 'test-token'
  service.list.mockReset()
  service.updateStatus.mockReset()
  stubGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminMessages listing', () => {
  it('loads through the messages service with page/pageSize and no status filter', async () => {
    service.list.mockResolvedValue(page([message()]))

    const inbox = useAdminMessages()

    await asyncData.run()

    // 排序交给后端默认值（UNREAD first + createdAt desc），前端不发送 sort / order
    expect(service.list).toHaveBeenCalledWith('test-token', { page: 1, pageSize: MESSAGE_PAGE_SIZE })
    expect(inbox.status.value).toBe('success')
    expect(inbox.items.value).toHaveLength(1)
  })

  it('sends the status filter and resets to the first page', async () => {
    service.list.mockResolvedValue(page([message({ status: 'ARCHIVED' })]))

    const inbox = useAdminMessages()

    inbox.query.page = 3
    inbox.setFilter('ARCHIVED')
    await asyncData.run()

    expect(inbox.query.page).toBe(1)
    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 1,
      pageSize: MESSAGE_PAGE_SIZE,
      status: 'ARCHIVED',
    })
  })

  it('selects the first message automatically and keeps the selection across refreshes', async () => {
    service.list.mockResolvedValue(page([message({ id: 'm1' }), message({ id: 'm2' })]))

    const inbox = useAdminMessages()

    expect(inbox.selected.value).toBeNull()

    await asyncData.run()
    flushWatchers()

    expect(inbox.selectedId.value).toBe('m1')
    expect(inbox.selected.value?.id).toBe('m1')

    // 用户手动选择后，刷新不应把选择重置回第一条
    inbox.selectedId.value = 'm2'
    flushWatchers()

    expect(inbox.selectedId.value).toBe('m2')
  })
})

describe('useAdminMessages status changes', () => {
  it('updates the status through the service and replaces the item in place', async () => {
    service.list.mockResolvedValue(page([message()]))
    service.updateStatus.mockResolvedValue(message({ status: 'READ' }))

    const inbox = useAdminMessages()

    await asyncData.run()
    flushWatchers()

    await expect(inbox.setStatus('READ')).resolves.toBe(true)

    expect(service.updateStatus).toHaveBeenCalledWith('test-token', 'm1', 'READ')
    expect(inbox.items.value[0]?.status).toBe('READ')
    expect(inbox.updateErrorKey.value).toBeNull()
  })

  it('maps a 401 to the session-expired message and keeps the item unchanged', async () => {
    service.list.mockResolvedValue(page([message()]))
    service.updateStatus.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    )

    const inbox = useAdminMessages()

    await asyncData.run()
    flushWatchers()

    await expect(inbox.setStatus('READ')).resolves.toBe(false)

    expect(inbox.updateErrorKey.value).toBe('admin.messages.sessionExpired')
    expect(inbox.items.value[0]?.status).toBe('UNREAD')
  })

  it('maps other failures to a retry message', async () => {
    service.list.mockResolvedValue(page([message()]))
    service.updateStatus.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }))

    const inbox = useAdminMessages()

    await asyncData.run()
    flushWatchers()

    await inbox.setStatus('ARCHIVED')

    expect(inbox.updateErrorKey.value).toBe('admin.messages.updateError')
  })

  it('refuses to call the API without an access token', async () => {
    auth.accessToken = null
    service.list.mockResolvedValue(page([message()]))

    const inbox = useAdminMessages()

    await asyncData.run().catch(() => undefined)

    expect(inbox.selected.value).toBeNull()
  })
})
