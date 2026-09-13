import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminContentList } from '~/composables/useAdminContentList'
import { useAdminMediaLibrary } from '~/composables/useAdminMediaLibrary'
import type { AdminMediaItem } from '~/services/admin-media.service'

// Phase 4-F.4：Admin Media Library 的可测试逻辑（列表 / 上传 / alt / 删除）。
// 这里复用真实的 useAdminContentList（含 MIN 接口收窄），只替换 auth / service / useAsyncData。

const auth = { accessToken: 'test-token' as string | null }
const service = {
  list: vi.fn(),
  updateAlt: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
}

let asyncData: {
  data: ReturnType<typeof ref>
  status: ReturnType<typeof ref>
  error: ReturnType<typeof ref>
  run: () => Promise<void>
}

const item: AdminMediaItem = {
  id: 'm1',
  url: 'http://storage.test/m1.webp',
  filename: 'm1.webp',
  originalFilename: 'cover.webp',
  mimeType: 'image/webp',
  size: 2048,
  width: 1200,
  height: 800,
  alt: 'Cover',
  provider: 'local',
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
}

function page(items: AdminMediaItem[], meta?: Partial<{ page: number; pageSize: number; total: number; totalPages: number }>) {
  return {
    items,
    meta: { page: 1, pageSize: 24, total: items.length, totalPages: 1, ...meta },
  }
}

function pngFile(name = 'cover.png'): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' })
}

/** 只有 size / name / type 会被读到；node 环境下像素预检直接短路。 */
function fileLike(name: string, type: string, size: number): File {
  return { name, type, size } as File
}

function conflict(details: unknown) {
  return { data: { error: { details } } }
}

function stubGlobals() {
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminMediaService', () => service)
  // 用真实实现，保证分页参数 / 局部更新走的是生产代码路径。
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

    asyncData = { data, status, error, run }

    return { data, status, error, refresh: run }
  })
}

beforeEach(() => {
  auth.accessToken = 'test-token'
  service.list.mockReset()
  service.updateAlt.mockReset()
  service.remove.mockReset()
  service.upload.mockReset()
  stubGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminMediaLibrary listing', () => {
  it('starts idle and loads through the media service with an explicit pageSize of 24', async () => {
    service.list.mockResolvedValue(page([item]))

    const library = useAdminMediaLibrary()

    expect(library.status.value).toBe('idle')

    await asyncData.run()

    expect(library.status.value).toBe('success')
    expect(library.items.value).toEqual([item])
    expect(library.meta.value).toEqual({ page: 1, pageSize: 24, total: 1, totalPages: 1 })

    // Media API 不接受 status / featured / sort / order / search（forbidNonWhitelisted → 400）
    expect(service.list).toHaveBeenCalledWith('test-token', { page: 1, pageSize: 24 })
  })

  it('sends the requested page on refresh', async () => {
    service.list.mockResolvedValue(page([item], { page: 2, total: 25, totalPages: 2 }))

    const library = useAdminMediaLibrary()

    library.query.page = 2

    await library.refresh()

    expect(service.list).toHaveBeenLastCalledWith('test-token', { page: 2, pageSize: 24 })
    expect(library.meta.value?.totalPages).toBe(2)
  })

  it('surfaces the empty and error states', async () => {
    service.list.mockResolvedValue(page([], { total: 0, totalPages: 0 }))

    const library = useAdminMediaLibrary()

    await library.refresh()

    expect(library.items.value).toEqual([])
    expect(library.status.value).toBe('success')

    service.list.mockRejectedValueOnce(new Error('boom'))
    await library.refresh()

    expect(library.status.value).toBe('error')

    service.list.mockResolvedValue(page([item]))
    await library.refresh()

    expect(library.status.value).toBe('success')
  })

  it('reports 401 without calling the API when there is no access token', async () => {
    auth.accessToken = null

    useAdminMediaLibrary()
    await asyncData.run()

    expect(service.list).not.toHaveBeenCalled()
    expect((asyncData.error.value as { statusCode?: number }).statusCode).toBe(401)
  })
})

describe('useAdminMediaLibrary upload', () => {
  it('uploads a valid image, resets to page 1 and reloads the list', async () => {
    service.list.mockResolvedValue(page([item]))
    service.upload.mockResolvedValue(item)

    const library = useAdminMediaLibrary()
    const file = pngFile()

    library.query.page = 2

    const result = await library.uploadFile(file, 'Cover image')

    expect(result).toBe(true)
    expect(service.upload).toHaveBeenCalledWith('test-token', file, 'Cover image')
    expect(library.uploadSuccess.value).toBe(true)
    expect(library.uploadErrorKey.value).toBeNull()
    expect(library.isUploading.value).toBe(false)
    expect(library.query.page).toBe(1)
    expect(service.list).toHaveBeenCalledTimes(1)
  })

  it('rejects a missing / empty / oversized / unsupported file without calling the API', async () => {
    const library = useAdminMediaLibrary()

    expect(await library.uploadFile(null)).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.FILE_MISSING')

    expect(await library.uploadFile(fileLike('cover.png', 'image/png', 0))).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.FILE_EMPTY')

    expect(await library.uploadFile(fileLike('cover.png', 'image/png', 11 * 1024 * 1024))).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.FILE_TOO_LARGE')

    expect(await library.uploadFile(fileLike('clip.gif', 'image/gif', 1024))).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.EXTENSION_NOT_ALLOWED')

    expect(await library.uploadFile(fileLike('cover.png', 'image/gif', 1024))).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.MIME_NOT_ALLOWED')

    expect(service.upload).not.toHaveBeenCalled()
    expect(library.isUploading.value).toBe(false)
  })

  it('maps upload failures to the stable reason key', async () => {
    service.upload.mockRejectedValueOnce(conflict([{ reason: 'STORAGE_WRITE_FAILED' }]))

    const library = useAdminMediaLibrary()

    expect(await library.uploadFile(pngFile())).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.STORAGE_WRITE_FAILED')
    expect(library.uploadSuccess.value).toBe(false)
    expect(library.isUploading.value).toBe(false)
  })

  it('prevents duplicate submissions while an upload is in flight', async () => {
    let resolveUpload: (value: AdminMediaItem) => void = () => {}

    service.upload.mockReturnValue(
      new Promise<AdminMediaItem>((resolve) => {
        resolveUpload = resolve
      }),
    )
    service.list.mockResolvedValue(page([item]))

    const library = useAdminMediaLibrary()
    const file = pngFile()

    const first = library.uploadFile(file)
    // 预检是异步的：守卫必须在 await 之前生效，否则双击会发出两个请求。
    const second = await library.uploadFile(file)

    expect(second).toBe(false)
    expect(service.upload).toHaveBeenCalledTimes(1)
    expect(library.isUploading.value).toBe(true)

    resolveUpload(item)

    expect(await first).toBe(true)
    expect(library.isUploading.value).toBe(false)
  })

  it('requires a token before uploading', async () => {
    auth.accessToken = null

    const library = useAdminMediaLibrary()

    expect(await library.uploadFile(pngFile())).toBe(false)
    expect(library.uploadErrorKey.value).toBe('admin.media.errors.UNAUTHORIZED')
    expect(service.upload).not.toHaveBeenCalled()
  })
})

describe('useAdminMediaLibrary alt editing', () => {
  it('opens the editor with the current alt and saves the updated item in place', async () => {
    service.list.mockResolvedValue(page([item]))
    service.updateAlt.mockResolvedValue({ ...item, alt: 'Updated alt' })

    const library = useAdminMediaLibrary()

    await library.refresh()

    library.openAltEditor(item)

    expect(library.editingItem.value).toEqual(item)
    expect(library.editingAlt.value).toBe('Cover')

    library.editingAlt.value = '  Updated alt  '

    expect(await library.saveAlt()).toBe(true)
    expect(service.updateAlt).toHaveBeenCalledWith('test-token', 'm1', 'Updated alt')
    expect(library.editingItem.value).toBeNull()
    expect(library.items.value[0]?.alt).toBe('Updated alt')
    expect(library.isSavingAlt.value).toBe(false)
  })

  it('clears alt by sending null when the field is blank', async () => {
    service.list.mockResolvedValue(page([item]))
    service.updateAlt.mockResolvedValue({ ...item, alt: null })

    const library = useAdminMediaLibrary()

    await library.refresh()
    library.openAltEditor(item)
    library.editingAlt.value = '   '

    expect(await library.saveAlt()).toBe(true)
    expect(service.updateAlt).toHaveBeenCalledWith('test-token', 'm1', null)
    expect(library.items.value[0]?.alt).toBeNull()
  })

  it('keeps the editor open and reports the API error', async () => {
    service.updateAlt.mockRejectedValueOnce(conflict([{ reason: 'MEDIA_NOT_FOUND' }]))

    const library = useAdminMediaLibrary()

    library.openAltEditor(item)
    library.editingAlt.value = 'Nope'

    expect(await library.saveAlt()).toBe(false)
    expect(library.altErrorKey.value).toBe('admin.media.errors.MEDIA_NOT_FOUND')
    expect(library.editingItem.value).toEqual(item)

    service.updateAlt.mockRejectedValueOnce(new Error('boom'))

    await library.saveAlt()
    expect(library.altErrorKey.value).toBe('admin.media.errors.unknown')
  })

  it('does nothing without a selection or a token', async () => {
    const library = useAdminMediaLibrary()

    expect(await library.saveAlt()).toBe(false)
    expect(service.updateAlt).not.toHaveBeenCalled()

    auth.accessToken = null
    library.openAltEditor(item)

    expect(await library.saveAlt()).toBe(false)
    expect(library.altErrorKey.value).toBe('admin.media.errors.UNAUTHORIZED')
  })
})

describe('useAdminMediaLibrary delete', () => {
  it('confirms, deletes and reloads the current page', async () => {
    service.list.mockResolvedValue(page([item, { ...item, id: 'm2' }]))
    service.remove.mockResolvedValue({ id: 'm1', deleted: true })

    const library = useAdminMediaLibrary()

    await library.refresh()
    library.openDeleteDialog(item)

    expect(library.pendingDelete.value).toEqual(item)

    expect(await library.confirmDelete()).toBe(true)
    expect(service.remove).toHaveBeenCalledWith('test-token', 'm1')
    expect(library.pendingDelete.value).toBeNull()
    expect(library.isDeleting.value).toBe(false)
    expect(service.list).toHaveBeenCalledTimes(2)
  })

  it('cancels without calling the API', async () => {
    const library = useAdminMediaLibrary()

    library.openDeleteDialog(item)
    library.closeDeleteDialog()

    expect(library.pendingDelete.value).toBeNull()
    expect(service.remove).not.toHaveBeenCalled()
  })

  it('reports MEDIA_IN_USE with the reference counts returned by the backend', async () => {
    service.remove.mockRejectedValueOnce(
      conflict([
        {
          reason: 'MEDIA_IN_USE',
          references: { worksCover: 1, labsCover: 0, writingsCover: 0, workMedia: 1, labMedia: 0, writingMedia: 0, total: 2 },
        },
      ]),
    )

    const library = useAdminMediaLibrary()

    library.openDeleteDialog(item)

    expect(await library.confirmDelete()).toBe(false)
    expect(library.deleteErrorKey.value).toBe('admin.media.errors.MEDIA_IN_USE')
    expect(library.deleteReferences.value).toEqual([
      { key: 'admin.media.references.workCover', count: 1 },
      { key: 'admin.media.references.workGallery', count: 1 },
    ])
    // 失败时保留对话框，用户可以取消或重试。
    expect(library.pendingDelete.value).toEqual(item)
  })

  it('falls back to the generic error key for unexpected failures', async () => {
    service.remove.mockRejectedValueOnce(new Error('boom'))

    const library = useAdminMediaLibrary()

    library.openDeleteDialog(item)

    expect(await library.confirmDelete()).toBe(false)
    expect(library.deleteErrorKey.value).toBe('admin.media.errors.unknown')
    expect(library.deleteReferences.value).toEqual([])
  })

  it('steps back a page when the last item of a later page is deleted', async () => {
    service.list.mockResolvedValue(page([item], { page: 2, total: 25, totalPages: 2 }))
    service.remove.mockResolvedValue({ id: 'm1', deleted: true })

    const library = useAdminMediaLibrary()

    await library.refresh()
    library.query.page = 2
    library.openDeleteDialog(item)

    await library.confirmDelete()

    expect(library.query.page).toBe(1)
    expect(service.list).toHaveBeenLastCalledWith('test-token', { page: 1, pageSize: 24 })
  })

  it('requires a token before deleting', async () => {
    auth.accessToken = null

    const library = useAdminMediaLibrary()

    library.openDeleteDialog(item)

    expect(await library.confirmDelete()).toBe(false)
    expect(library.deleteErrorKey.value).toBe('admin.media.errors.UNAUTHORIZED')
    expect(service.remove).not.toHaveBeenCalled()
  })
})
