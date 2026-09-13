import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminMediaService } from '~/services/admin-media.service'

// Phase 4-F.4：Media service 必须解包统一 envelope（docs/API.md §5），
// 且上传走独立的 multipart 通道（FormData 不进入共享 JSON resource）。

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminMediaService listing and mutations', () => {
  it('unwraps items and meta from the pagination envelope', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [{ id: 'm1', url: 'http://storage.test/m1.webp', filename: 'm1.webp' }],
      meta: { page: 2, pageSize: 24, total: 25, totalPages: 2 },
    })

    const result = await useAdminMediaService().list('token', { page: 2, pageSize: 24 })

    expect(result.items).toHaveLength(1)
    expect(result.meta).toEqual({ page: 2, pageSize: 24, total: 25, totalPages: 2 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/media',
      expect.objectContaining({
        baseURL: 'http://api.test/api/v1',
        headers: { Authorization: 'Bearer token' },
        query: { page: 2, pageSize: 24 },
      }),
    )
  })

  it('never returns a non-array media list', async () => {
    fetchMock.mockResolvedValue({ success: true, data: null, meta: null })

    const result = await useAdminMediaService().list('token', {})

    expect(result.items).toEqual([])
  })

  it('PATCHes only the alt field and returns the updated item', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'm1', alt: null }, meta: null })

    const updated = await useAdminMediaService().updateAlt('token', 'm1', null)

    expect(updated).toEqual({ id: 'm1', alt: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/media/m1',
      expect.objectContaining({ method: 'PATCH', body: { alt: null } }),
    )
  })

  it('DELETEs and returns the delete result from the envelope', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'm1', deleted: true }, meta: null })

    const result = await useAdminMediaService().remove('token', 'm1')

    expect(result).toEqual({ id: 'm1', deleted: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/media/m1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('useAdminMediaService.upload', () => {
  function pngFile() {
    return new File([new Uint8Array([137, 80, 78, 71])], 'cover.png', { type: 'image/png' })
  }

  it('posts multipart FormData with only file + alt and a longer timeout', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'm1', alt: 'Cover' }, meta: null })

    const file = pngFile()
    const item = await useAdminMediaService().upload('token', file, 'Cover')
    const [, options] = fetchMock.mock.calls[0] as [string, Record<string, unknown>]

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/admin/media')
    expect(options).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      timeout: 30_000,
      baseURL: 'http://api.test/api/v1',
    })
    expect(options.body).toBeInstanceOf(FormData)

    // 客户端字段只允许 file / alt：storageKey、url、mimeType 等一律不接受。
    const body = options.body as FormData

    expect([...body.keys()].sort()).toEqual(['alt', 'file'])
    expect(body.get('file')).toBe(file)
    expect(body.get('alt')).toBe('Cover')
    expect(item).toEqual({ id: 'm1', alt: 'Cover' })
  })

  it('omits alt entirely when it is missing or blank', async () => {
    fetchMock.mockResolvedValue({ success: true, data: { id: 'm1' }, meta: null })

    await useAdminMediaService().upload('token', pngFile())
    await useAdminMediaService().upload('token', pngFile(), '   ')

    for (const call of fetchMock.mock.calls) {
      const body = (call[1] as { body: FormData }).body

      expect([...body.keys()]).toEqual(['file'])
    }
  })
})
