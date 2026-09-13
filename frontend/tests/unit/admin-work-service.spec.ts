import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminReferenceService } from '~/services/admin-content.service'
import { useAdminWorkService } from '~/services/admin-work.service'

// Phase 4-B 回归：service 层必须解包统一响应 envelope（docs/API.md §5），
// 否则 composable/组件会把 { success, data, meta } 当成业务数据。

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminWorkService.list', () => {
  it('unwraps data and meta from the response envelope', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [{ id: 'w1', slug: 'eson-web', status: 'PUBLISHED', featured: true, title: 'Eson_web' }],
      meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
    })

    const result = await useAdminWorkService().list('token', { page: 2, pageSize: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.slug).toBe('eson-web')
    expect(result.meta).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/works',
      expect.objectContaining({
        baseURL: 'http://api.test/api/v1',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('falls back to a single synthesized page when meta is missing', async () => {
    fetchMock.mockResolvedValue({ success: true, data: [{ id: 'w1' }, { id: 'w2' }], meta: null })

    const result = await useAdminWorkService().list('token', {})

    expect(result.meta).toEqual({ page: 1, pageSize: 2, total: 2, totalPages: 1 })
  })

  it('never returns a non-array item list', async () => {
    fetchMock.mockResolvedValue({ success: true, data: null, meta: null })

    const result = await useAdminWorkService().list('token', {})

    expect(result.items).toEqual([])
  })
})

describe('useAdminWorkService mutations', () => {
  it('returns the detail payload, not the envelope', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'w1', slug: 'eson-web' }, meta: null })

    const detail = await useAdminWorkService().detail('token', 'w1')

    expect(detail).toEqual({ id: 'w1', slug: 'eson-web' })
  })

  it('creates and updates with the right methods', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'w1' }, meta: null })

    await useAdminWorkService().create('token', { slug: 'eson-web' })
    await useAdminWorkService().update('token', 'w1', { featured: true })

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', body: { slug: 'eson-web' } })
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PATCH', body: { featured: true } })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/admin/works/w1')
  })

  it('returns the delete result from the envelope', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'w1', deleted: true }, meta: null })

    const result = await useAdminWorkService().remove('token', 'w1')

    expect(result).toEqual({ id: 'w1', deleted: true })
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})

describe('useAdminReferenceService', () => {
  it('unwraps reference option arrays', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [{ id: 'c1', slug: 'frontend', name: '前端' }],
      meta: null,
    })

    const options = await useAdminReferenceService().fetchOptions('token', '/admin/categories')

    expect(options).toEqual([{ id: 'c1', slug: 'frontend', name: '前端' }])
  })

  it('never returns a non-array option list (envelope regression guard)', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { unexpected: true }, meta: null })

    const options = await useAdminReferenceService().fetchOptions('token', '/admin/tags')

    expect(options).toEqual([])
  })
})
