import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminContentList } from '~/composables/useAdminContentList'
import { useAdminMediaPicker } from '~/composables/useAdminMediaPicker'
import type { AdminMediaItem } from '~/services/admin-media.service'

// Phase 4-F.5：MediaPicker 的列表参数与草稿选择状态（Confirm / Cancel 语义）。

const auth = { accessToken: 'test-token' as string | null }
const service = { list: vi.fn(), updateAlt: vi.fn(), remove: vi.fn(), upload: vi.fn() }

let asyncData: { run: () => Promise<void>; status: ReturnType<typeof ref> }

function mediaItem(id: string): AdminMediaItem {
  return {
    id,
    url: `http://media.test/${id}.webp`,
    filename: `${id}.webp`,
    originalFilename: `${id}.webp`,
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

function page(items: AdminMediaItem[], meta?: Partial<{ page: number; pageSize: number; total: number; totalPages: number }>) {
  return { items, meta: { page: 1, pageSize: 24, total: items.length, totalPages: 1, ...meta } }
}

function stubGlobals() {
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminMediaService', () => service)
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

    asyncData = { run, status }

    return { data, status, error, refresh: run }
  })
}

beforeEach(() => {
  auth.accessToken = 'test-token'
  service.list.mockReset()
  stubGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminMediaPicker list', () => {
  it('only sends page / pageSize (Media API rejects sort, status, featured)', async () => {
    service.list.mockResolvedValue(page([mediaItem('m1'), mediaItem('m2')]))

    const picker = useAdminMediaPicker({ scope: 'work-cover', mode: 'single', selectedIds: [] })

    await asyncData.run()

    expect(service.list).toHaveBeenCalledWith('test-token', { page: 1, pageSize: 24 })
    expect(picker.items.value).toHaveLength(2)
  })

  it('follows pagination', async () => {
    service.list.mockResolvedValue(page([mediaItem('m1')], { page: 2, total: 25, totalPages: 2 }))

    const picker = useAdminMediaPicker({ scope: 'work-cover', mode: 'single', selectedIds: [] })

    picker.query.page = 2
    await picker.refresh()

    expect(service.list).toHaveBeenLastCalledWith('test-token', { page: 2, pageSize: 24 })
  })

  it('surfaces loading / empty / error states through the shared list', async () => {
    service.list.mockResolvedValue(page([], { total: 0, totalPages: 0 }))

    const picker = useAdminMediaPicker({ scope: 'work-gallery', mode: 'multiple', selectedIds: [] })

    await picker.refresh()
    expect(picker.status.value).toBe('success')
    expect(picker.items.value).toEqual([])

    service.list.mockRejectedValueOnce(new Error('boom'))
    await picker.refresh()
    expect(picker.status.value).toBe('error')

    service.list.mockResolvedValue(page([mediaItem('m1')]))
    await picker.refresh()
    expect(picker.status.value).toBe('success')
  })
})

describe('useAdminMediaPicker selection', () => {
  it('initializes the draft from the current form selection (deduped)', () => {
    const picker = useAdminMediaPicker({
      scope: 'work-gallery',
      mode: 'multiple',
      selectedIds: ['a', 'b', 'a'],
    })

    expect(picker.draftIds.value).toEqual(['a', 'b'])
    expect(picker.isSelected('a')).toBe(true)
    expect(picker.isSelected('z')).toBe(false)
  })

  it('replaces the draft in single mode and toggles in multiple mode', () => {
    const single = useAdminMediaPicker({ scope: 'work-cover', mode: 'single', selectedIds: ['a'] })

    single.toggle('b')
    expect(single.draftIds.value).toEqual(['b'])
    single.toggle('b')
    expect(single.draftIds.value).toEqual([])

    const multiple = useAdminMediaPicker({ scope: 'work-gallery', mode: 'multiple', selectedIds: ['a'] })

    multiple.toggle('b')
    multiple.toggle('c')
    expect(multiple.draftIds.value).toEqual(['a', 'b', 'c'])
    multiple.toggle('b')
    expect(multiple.draftIds.value).toEqual(['a', 'c'])
  })

  it('blocks confirm in single mode until exactly one media is selected', () => {
    const picker = useAdminMediaPicker({ scope: 'work-cover', mode: 'single', selectedIds: [] })

    expect(picker.canConfirm.value).toBe(false)

    picker.toggle('a')
    expect(picker.canConfirm.value).toBe(true)
    expect(picker.selectedCount.value).toBe(1)

    picker.toggle('a')
    expect(picker.canConfirm.value).toBe(false)
  })

  it('allows an empty selection in multiple mode (clears the gallery)', () => {
    const picker = useAdminMediaPicker({ scope: 'work-gallery', mode: 'multiple', selectedIds: ['a'] })

    picker.toggle('a')

    expect(picker.draftIds.value).toEqual([])
    expect(picker.canConfirm.value).toBe(true)
  })

  it('returns only the media details of the current page with the draft ids', async () => {
    service.list.mockResolvedValue(page([mediaItem('m1'), mediaItem('m2')]))

    const picker = useAdminMediaPicker({ scope: 'work-gallery', mode: 'multiple', selectedIds: ['m1'] })

    await asyncData.run()
    picker.toggle('m2')

    expect(picker.draftIds.value).toEqual(['m1', 'm2'])
    expect(picker.selectedItems().map((item) => item.id)).toEqual(['m1', 'm2'])
  })
})
