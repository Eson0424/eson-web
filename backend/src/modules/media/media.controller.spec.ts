import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../auth/jwt-auth.guard.js'
import { MediaController, MULTIPART_ALLOWED_MIME_PATTERN } from './media.controller.js'
import type { MediaService } from './media.service.js'

const MEDIA_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const media = {
    listForAdmin: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    upload: vi.fn().mockResolvedValue({
      id: MEDIA_ID,
      url: 'http://localhost:3001/media/2026/09/x.png',
      filename: 'x.png',
      originalFilename: 'x.png',
      mimeType: 'image/png',
      size: 10,
      width: 1,
      height: 1,
      alt: null,
      metadata: { provider: 'local' },
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      updatedAt: new Date('2026-09-13T00:00:00.000Z'),
    }),
    updateMetadata: vi.fn().mockResolvedValue({
      id: MEDIA_ID,
      url: 'http://localhost:3001/media/2026/09/x.png',
      filename: 'x.png',
      originalFilename: 'x.png',
      mimeType: 'image/png',
      size: 10,
      width: 1,
      height: 1,
      alt: 'updated',
      metadata: null,
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      updatedAt: new Date('2026-09-13T00:00:00.000Z'),
    }),
    remove: vi.fn().mockResolvedValue({ id: MEDIA_ID, deleted: true }),
  }

  return { media, controller: new MediaController(media as unknown as MediaService) }
}

describe('MediaController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, MediaController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('lists media through the service', async () => {
    const { controller, media } = createController()

    await controller.list({ page: 1, pageSize: 100 } as never)

    expect(media.listForAdmin).toHaveBeenCalledTimes(1)
  })

  it('passes the multipart file + alt to the authoritative service upload', async () => {
    const { controller, media } = createController()
    const buffer = Buffer.from('image-bytes')

    const view = await controller.upload(
      { originalname: 'cover.png', mimetype: 'image/png', size: buffer.length, buffer },
      { alt: '封面' },
    )

    expect(media.upload).toHaveBeenCalledWith({
      buffer,
      declaredMimeType: 'image/png',
      originalFilename: 'cover.png',
      alt: '封面',
    })
    // 响应只暴露 admin 视图，不含 storageKey
    expect(view).toMatchObject({ id: MEDIA_ID, mimeType: 'image/png' })
    expect(view).not.toHaveProperty('storageKey')
  })

  it('still calls the service when no file is provided (service reports FILE_MISSING)', async () => {
    const { controller, media } = createController()

    await controller.upload(undefined, {})

    expect(media.upload).toHaveBeenCalledWith({
      buffer: undefined,
      declaredMimeType: undefined,
      originalFilename: undefined,
      alt: undefined,
    })
  })

  it('delegates metadata updates and deletes', async () => {
    const { controller, media } = createController()

    const updated = await controller.update(MEDIA_ID, { alt: 'updated' })

    expect(media.updateMetadata).toHaveBeenCalledWith(MEDIA_ID, { alt: 'updated' })
    expect(updated).toMatchObject({ id: MEDIA_ID, alt: 'updated' })

    await expect(controller.remove(MEDIA_ID)).resolves.toEqual({ id: MEDIA_ID, deleted: true })
    expect(media.remove).toHaveBeenCalledWith(MEDIA_ID)
  })

  it('only accepts the four allowed image mime types at the transport layer', () => {
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('image/png')).toBe(true)
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('image/jpeg')).toBe(true)
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('image/webp')).toBe(true)
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('image/avif')).toBe(true)
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('image/svg+xml')).toBe(false)
    expect(MULTIPART_ALLOWED_MIME_PATTERN.test('application/pdf')).toBe(false)
  })
})
