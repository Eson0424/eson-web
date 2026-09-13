import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminExperienceService } from '~/services/admin-experience.service'

// Phase 4-E：Experience service 复用共享 envelope 解包，路径为 /admin/experiences。

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminExperienceService', () => {
  it('lists experiences from /admin/experiences and unwraps data + meta', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'e1',
          role: '软件工程师',
          company: '示例公司',
          isCurrent: true,
          sortOrder: 1,
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })

    const result = await useAdminExperienceService().list('token', { page: 1, pageSize: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.role).toBe('软件工程师')
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/experiences',
      expect.objectContaining({
        baseURL: 'http://api.test/api/v1',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('never returns a non-array item list', async () => {
    fetchMock.mockResolvedValue({ success: true, data: null, meta: null })

    expect((await useAdminExperienceService().list('token', {})).items).toEqual([])
  })

  it('returns detail / create / update / delete payloads without the envelope', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: { id: 'e1', sortOrder: 1, isCurrent: false, translations: [] },
      meta: null,
    })

    await expect(useAdminExperienceService().detail('token', 'e1')).resolves.toMatchObject({
      sortOrder: 1,
    })

    await useAdminExperienceService().create('token', { translations: [] })
    await useAdminExperienceService().update('token', 'e1', { isCurrent: true })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/admin/experiences/e1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/admin/experiences/e1')

    fetchMock.mockResolvedValue({ success: true, data: { id: 'e1', deleted: true }, meta: null })

    await expect(useAdminExperienceService().remove('token', 'e1')).resolves.toEqual({
      id: 'e1',
      deleted: true,
    })
  })
})
