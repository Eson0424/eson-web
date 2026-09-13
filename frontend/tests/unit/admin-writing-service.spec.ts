import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminWritingService } from '~/services/admin-writing.service'

// Phase 4-D：Writing service 复用共享 envelope 解包逻辑，路径必须是 /admin/writings。

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminWritingService', () => {
  it('lists writings from /admin/writings and unwraps data + meta', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [{ id: 'w1', slug: 'notes-on-agent-workflows', status: 'PUBLISHED', featured: true }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })

    const result = await useAdminWritingService().list('token', { page: 1, pageSize: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.slug).toBe('notes-on-agent-workflows')
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/writings',
      expect.objectContaining({
        baseURL: 'http://api.test/api/v1',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('never returns a non-array item list', async () => {
    fetchMock.mockResolvedValue({ success: true, data: null, meta: null })

    expect((await useAdminWritingService().list('token', {})).items).toEqual([])
  })

  it('returns detail / create / update / delete payloads without the envelope', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: { id: 'w1', slug: 'notes', translations: [{ locale: 'zh-CN', content: '# Heading' }] },
      meta: null,
    })

    await expect(useAdminWritingService().detail('token', 'w1')).resolves.toMatchObject({
      slug: 'notes',
    })

    await useAdminWritingService().create('token', { slug: 'notes' })
    await useAdminWritingService().update('token', 'w1', { featured: true })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/admin/writings/w1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/admin/writings/w1')

    fetchMock.mockResolvedValue({ success: true, data: { id: 'w1', deleted: true }, meta: null })

    await expect(useAdminWritingService().remove('token', 'w1')).resolves.toEqual({
      id: 'w1',
      deleted: true,
    })
  })
})
