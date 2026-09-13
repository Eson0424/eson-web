import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminMediaOptions } from '~/composables/useAdminMediaOptions'
import type { AdminMediaItem } from '~/services/admin-media.service'

// Phase 4-F.5：已选媒体详情缓存。detail 只返回 id 列表，缩略图需要 id → 媒体详情，
// 这里验证“第 1 页 + 有界回填”的解析策略（不新增后端接口）。

const auth = { accessToken: 'test-token' as string | null }
const service = { list: vi.fn(), updateAlt: vi.fn(), remove: vi.fn(), upload: vi.fn() }

function mediaItem(id: string): AdminMediaItem {
  return {
    id,
    url: `http://media.test/${id}.webp`,
    filename: `${id}.webp`,
    originalFilename: null,
    mimeType: 'image/webp',
    size: 1024,
    width: 1200,
    height: 800,
    alt: null,
    provider: 'local',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  }
}

function page(items: AdminMediaItem[], totalPages: number) {
  return { items, meta: { page: 1, pageSize: 100, total: items.length, totalPages } }
}

beforeEach(() => {
  auth.accessToken = 'test-token'
  service.list.mockReset()
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminMediaService', () => service)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminMediaOptions.ensure', () => {
  it('fetches only the first page when every requested id is already there', async () => {
    service.list.mockResolvedValue(page([mediaItem('m1'), mediaItem('m2')], 3))

    const options = useAdminMediaOptions()

    await options.ensure(['m1'])

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.list).toHaveBeenCalledWith('test-token', { page: 1, pageSize: 100 })
    expect(options.byId('m2')?.id).toBe('m2')
    expect(options.error.value).toBe(false)
  })

  it('walks further pages only while ids stay unresolved', async () => {
    service.list
      .mockResolvedValueOnce(page([mediaItem('m1')], 3))
      .mockResolvedValueOnce(page([mediaItem('m2')], 3))

    const options = useAdminMediaOptions()

    await options.ensure(['m2'])

    expect(service.list).toHaveBeenCalledTimes(2)
    expect(service.list).toHaveBeenLastCalledWith('test-token', { page: 2, pageSize: 100 })
    expect(options.byId('m2')?.id).toBe('m2')

    service.list.mockClear()
    service.list.mockResolvedValue(page([mediaItem('m1'), mediaItem('m2')], 3))

    await options.ensure(['m1', 'm2'])

    // 缓存命中后不再翻页
    expect(service.list).toHaveBeenCalledTimes(1)
  })

  it('stops after a bounded number of pages when an id never resolves', async () => {
    service.list.mockResolvedValue(page([mediaItem('other')], 40))

    const options = useAdminMediaOptions()

    await options.ensure(['missing'])

    // LOOKUP_MAX_PAGES = 5
    expect(service.list).toHaveBeenCalledTimes(5)
    expect(options.byId('missing')).toBeNull()
  })

  it('reports a 401 without calling the API when there is no access token', async () => {
    auth.accessToken = null

    const options = useAdminMediaOptions()

    await expect(options.ensure(['m1'])).rejects.toThrow()
    expect(service.list).not.toHaveBeenCalled()
  })

  it('flags the error state instead of throwing when the list request fails', async () => {
    service.list.mockRejectedValueOnce(new Error('boom'))

    const options = useAdminMediaOptions()

    await options.ensure(['m1'])

    expect(options.error.value).toBe(true)
    expect(options.isLoading.value).toBe(false)
  })
})

describe('useAdminMediaOptions cache', () => {
  it('remembers media picked in the picker and resolves them by id', () => {
    const options = useAdminMediaOptions()

    options.remember([mediaItem('m1'), mediaItem('m2')])

    expect(options.byId('m1')?.url).toBe('http://media.test/m1.webp')
    expect(options.byId(null)).toBeNull()
    expect(options.byId('unknown')).toBeNull()
    expect(options.resolve(['m1', 'unknown']).map((item) => item?.id ?? null)).toEqual(['m1', null])
  })

  it('ignores empty remember batches', () => {
    const options = useAdminMediaOptions()

    options.remember([])

    expect(options.byId('m1')).toBeNull()
  })
})
