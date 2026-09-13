import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminLabService } from '~/services/admin-lab.service'

// Phase 4-C：Lab service 复用共享 envelope 解包逻辑，必须返回 data 而不是 envelope。

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminLabService', () => {
  it('lists labs from /admin/labs and unwraps data + meta', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [{ id: 'l1', slug: 'agent-workflow-prototype', status: 'PUBLISHED', featured: true }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })

    const result = await useAdminLabService().list('token', { page: 1, pageSize: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.slug).toBe('agent-workflow-prototype')
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/labs',
      expect.objectContaining({
        baseURL: 'http://api.test/api/v1',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('never returns a non-array item list', async () => {
    fetchMock.mockResolvedValue({ success: true, data: null, meta: null })

    const result = await useAdminLabService().list('token', {})

    expect(result.items).toEqual([])
  })

  it('returns detail / create / update / delete payloads without the envelope', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'l1', slug: 'agent-workflow' }, meta: null })

    await expect(useAdminLabService().detail('token', 'l1')).resolves.toEqual({
      id: 'l1',
      slug: 'agent-workflow',
    })

    await useAdminLabService().create('token', { slug: 'agent-workflow' })
    await useAdminLabService().update('token', 'l1', { featured: true })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/admin/labs/l1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/admin/labs/l1')

    fetchMock.mockResolvedValue({ success: true, data: { id: 'l1', deleted: true }, meta: null })

    await expect(useAdminLabService().remove('token', 'l1')).resolves.toEqual({ id: 'l1', deleted: true })
  })
})
