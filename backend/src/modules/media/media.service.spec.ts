import { Logger } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../../prisma/prisma.service.js'
import type { Media } from '@prisma/client'
import { AppError, ERROR_CODES } from '../../common/errors/app-error.js'
import { AdminMediaQueryDto } from './dto/admin-media-query.dto.js'
import { MediaService } from './media.service.js'
import type { StorageService } from './storage.service.js'
import { REAL_PNG_1X1, pngWithDimensions, randomBytes } from '../../../test/fixtures/image-fixtures.js'

const OBJECT_KEY = 'media/2026/09/550e8400-e29b-41d4-a716-446655440000.png'
const PUBLIC_URL = `http://localhost:3001/${OBJECT_KEY}`

function createHarness() {
  const storage = {
    isConfigured: vi.fn().mockReturnValue(true),
    isLocal: vi.fn().mockReturnValue(true),
    getDriverName: vi.fn().mockReturnValue('local'),
    getLocalRoot: vi.fn().mockReturnValue('/tmp/media'),
    buildObjectKey: vi.fn().mockReturnValue(OBJECT_KEY),
    buildPublicUrl: vi.fn().mockReturnValue(PUBLIC_URL),
    put: vi.fn().mockResolvedValue({ key: OBJECT_KEY, size: 123, contentType: 'image/png' }),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
  }

  const createdMedia = { id: 'media-1', storageKey: OBJECT_KEY, url: PUBLIC_URL } as Media
  const storedMedia = {
    id: 'media-1',
    storageKey: OBJECT_KEY,
    url: PUBLIC_URL,
    filename: 'cover.png',
    originalFilename: 'cover.png',
    mimeType: 'image/png',
    size: 123,
    width: 1600,
    height: 900,
    alt: '封面',
    metadata: { provider: 'local' },
    createdAt: new Date('2026-09-13T00:00:00.000Z'),
    updatedAt: new Date('2026-09-13T00:00:00.000Z'),
  } as Media

  const countMock = () => vi.fn().mockResolvedValue(0)

  const prisma = {
    media: {
      create: vi.fn().mockResolvedValue(createdMedia),
      findUnique: vi.fn().mockResolvedValue(storedMedia),
      findMany: vi.fn().mockResolvedValue([storedMedia]),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue({ ...storedMedia, alt: '新 alt' }),
      delete: vi.fn().mockResolvedValue(storedMedia),
    },
    work: { count: countMock() },
    lab: { count: countMock() },
    writing: { count: countMock() },
    workMedia: { count: countMock() },
    labMedia: { count: countMock() },
    writingMedia: { count: countMock() },
  }

  const service = new MediaService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
  )

  return { service, storage, prisma, createdMedia, storedMedia }
}

describe('MediaService.upload — happy path', () => {
  it('stores the object first, then creates the DB record with the validated metadata', async () => {
    const { service, storage, prisma, createdMedia } = createHarness()
    const buffer = pngWithDimensions(1600, 900)

    const result = await service.upload({
      buffer,
      declaredMimeType: 'image/png',
      originalFilename: 'cover.png',
      alt: '封面',
    })

    expect(result).toBe(createdMedia)
    expect(storage.put).toHaveBeenCalledWith({
      key: OBJECT_KEY,
      body: buffer,
      contentType: 'image/png',
    })
    expect(prisma.media.create).toHaveBeenCalledWith({
      data: {
        storageKey: OBJECT_KEY,
        url: PUBLIC_URL,
        filename: 'cover.png',
        originalFilename: 'cover.png',
        mimeType: 'image/png',
        size: 123,
        width: 1600,
        height: 900,
        alt: '封面',
        metadata: { provider: 'local' },
      },
    })

    // 顺序保证：storage.put 必须在 media.create 之前
    const putOrder = storage.put.mock.invocationCallOrder[0]!
    const createOrder = prisma.media.create.mock.invocationCallOrder[0]!

    expect(putOrder).toBeLessThan(createOrder)
  })

  it('falls back to the object key filename when the client sends no filename', async () => {
    const { service, prisma } = createHarness()

    await service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' })

    expect(prisma.media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        filename: '550e8400-e29b-41d4-a716-446655440000.png',
        originalFilename: null,
        alt: null,
      }),
    })
  })
})

describe('MediaService.upload — validation and storage failures', () => {
  it('rejects invalid content before touching storage or the database', async () => {
    const { service, storage, prisma } = createHarness()

    await expect(
      service.upload({ buffer: randomBytes(64), declaredMimeType: 'image/png', originalFilename: 'x.png' }),
    ).rejects.toMatchObject({ code: 'FILE_UPLOAD_ERROR', status: 422 })

    expect(storage.put).not.toHaveBeenCalled()
    expect(prisma.media.create).not.toHaveBeenCalled()
  })

  it('fails fast when storage is not configured', async () => {
    const { service, storage, prisma } = createHarness()

    storage.isConfigured.mockReturnValue(false)

    try {
      await service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' })
      throw new Error('expected upload to fail')
    } catch (error) {
      expect((error as { status?: number }).status).toBe(503)
      expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(
        'STORAGE_UNAVAILABLE',
      )
    }

    expect(storage.put).not.toHaveBeenCalled()
    expect(prisma.media.create).not.toHaveBeenCalled()
  })

  it('does not create a DB row when storage.put fails', async () => {
    const { service, storage, prisma } = createHarness()

    storage.put.mockRejectedValue(new Error('disk exploded: E:\\secret\\path'))

    try {
      await service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' })
      throw new Error('expected upload to fail')
    } catch (error) {
      expect((error as { status?: number }).status).toBe(500)
      expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(
        'STORAGE_WRITE_FAILED',
      )
      // 内部错误细节不外泄
      expect((error as Error).message).not.toContain('secret')
    }

    expect(prisma.media.create).not.toHaveBeenCalled()
  })

  it('keeps a stable 409 when the object key already exists', async () => {
    const { service, storage } = createHarness()

    storage.put.mockRejectedValue(
      new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Media object already exists', 409),
    )

    await expect(
      service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' }),
    ).rejects.toMatchObject({ status: 409 })
  })
})

describe('MediaService.upload — DB failure compensation', () => {
  let loggerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  it('deletes the stored object when the DB insert fails', async () => {
    const { service, storage, prisma } = createHarness()

    prisma.media.create.mockRejectedValue(new Error('db is down'))

    try {
      await service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' })
      throw new Error('expected upload to fail')
    } catch (error) {
      expect((error as { status?: number }).status).toBe(500)
      expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(
        'DATABASE_ERROR',
      )
      expect((error as Error).message).toBe('Failed to save the uploaded media record')
    }

    expect(storage.delete).toHaveBeenCalledWith(OBJECT_KEY)
    expect(loggerSpy).not.toHaveBeenCalled()

    loggerSpy.mockRestore()
  })

  it('logs a structured compensation failure without leaking it to the client', async () => {
    const { service, storage, prisma } = createHarness()

    prisma.media.create.mockRejectedValue(Object.assign(new Error('db is down'), { code: 'P1001' }))
    storage.delete.mockRejectedValue(new Error('storage unavailable'))

    await expect(
      service.upload({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png' }),
    ).rejects.toMatchObject({
      status: 500,
      code: 'FILE_UPLOAD_ERROR',
    })

    expect(storage.delete).toHaveBeenCalledWith(OBJECT_KEY)
    expect(loggerSpy).toHaveBeenCalledTimes(1)

    const payload = JSON.parse(loggerSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>

    expect(payload.event).toBe('media.upload.compensation_failed')
    expect(payload.objectKey).toBe(OBJECT_KEY)
    expect(payload.databaseError).toMatchObject({ message: 'db is down', code: 'P1001' })
    expect(payload.compensationError).toMatchObject({ message: 'storage unavailable' })
    // 日志中不包含文件内容
    expect(JSON.stringify(payload)).not.toContain(REAL_PNG_1X1.toString('base64').slice(0, 16))

    loggerSpy.mockRestore()
  })
})

describe('MediaService.listForAdmin', () => {
  it('paginates with createdAt DESC and returns a view without storageKey', async () => {
    const { service, prisma } = createHarness()
    const query = Object.assign(new AdminMediaQueryDto(), { page: 2, pageSize: 2 })

    const result = await service.listForAdmin(query)

    expect(prisma.media.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 2,
      take: 2,
    })
    expect(result.meta).toEqual({ page: 2, pageSize: 2, total: 1, totalPages: 1 })
    expect(result.data[0]).toEqual({
      id: 'media-1',
      url: PUBLIC_URL,
      filename: 'cover.png',
      originalFilename: 'cover.png',
      mimeType: 'image/png',
      size: 123,
      width: 1600,
      height: 900,
      alt: '封面',
      provider: 'local',
      createdAt: '2026-09-13T00:00:00.000Z',
      updatedAt: '2026-09-13T00:00:00.000Z',
    })
    // 绝不返回 storageKey 字段 / 磁盘绝对路径（url 中含 object key 属预期）
    expect(result.data[0]).not.toHaveProperty('storageKey')
    expect(JSON.stringify(result.data)).not.toContain('.data')
    expect(JSON.stringify(result.data)).not.toMatch(/[A-Za-z]:\\\\/)
  })

  it('reports totalPages 0 for an empty library and defaults to a 100-item page', async () => {
    const { service, prisma } = createHarness()

    prisma.media.findMany.mockResolvedValue([])
    prisma.media.count.mockResolvedValue(0)

    const defaultQuery = new AdminMediaQueryDto()

    expect(defaultQuery.pageSize).toBe(100)
    expect(defaultQuery.skip).toBe(0)

    const result = await service.listForAdmin(defaultQuery)

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ page: 1, pageSize: 100, total: 0, totalPages: 0 })
  })
})

describe('MediaService.updateMetadata', () => {
  it('updates only alt and returns the updated row', async () => {
    const { service, prisma } = createHarness()

    const updated = await service.updateMetadata('media-1', { alt: '  新 alt  ' })

    expect(prisma.media.update).toHaveBeenCalledWith({ where: { id: 'media-1' }, data: { alt: '新 alt' } })
    expect(updated).toMatchObject({ id: 'media-1' })
  })

  it('clears alt when null is provided and does not send other fields', async () => {
    const { service, prisma } = createHarness()

    await service.updateMetadata('media-1', { alt: null })

    expect(prisma.media.update).toHaveBeenCalledWith({ where: { id: 'media-1' }, data: { alt: null } })
  })

  it('throws 404 MEDIA_NOT_FOUND for an unknown id', async () => {
    const { service, prisma } = createHarness()

    prisma.media.findUnique.mockResolvedValue(null)

    try {
      await service.updateMetadata('missing-id', { alt: 'x' })
      throw new Error('expected update to fail')
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 })
      expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(
        'MEDIA_NOT_FOUND',
      )
    }

    expect(prisma.media.update).not.toHaveBeenCalled()
  })

  it('maps DB failures to a stable 500 and logs structured details', async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const { service, prisma } = createHarness()

    prisma.media.update.mockRejectedValue(new Error('db down'))

    await expect(service.updateMetadata('media-1', { alt: 'x' })).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 500,
    })

    const payload = JSON.parse(loggerSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>

    expect(payload).toMatchObject({ event: 'media.update.db_failure', mediaId: 'media-1' })
    expect(payload.databaseError).toMatchObject({ message: 'db down' })

    loggerSpy.mockRestore()
  })
})

describe('MediaService.remove — reference protection', () => {
  const referenceCases: Array<[string, (prisma: ReturnType<typeof createHarness>['prisma']) => void]> = [
    ['works.coverMediaId', (prisma) => prisma.work.count.mockResolvedValue(1)],
    ['labs.coverMediaId', (prisma) => prisma.lab.count.mockResolvedValue(1)],
    ['writings.coverMediaId', (prisma) => prisma.writing.count.mockResolvedValue(1)],
    ['work_media', (prisma) => prisma.workMedia.count.mockResolvedValue(1)],
    ['lab_media', (prisma) => prisma.labMedia.count.mockResolvedValue(1)],
    ['writing_media', (prisma) => prisma.writingMedia.count.mockResolvedValue(1)],
  ]

  it.each(referenceCases)('returns 409 MEDIA_IN_USE when referenced by %s', async (_label, arrange) => {
    const { service, storage, prisma } = createHarness()

    arrange(prisma)

    try {
      await service.remove('media-1')
      throw new Error('expected delete to fail')
    } catch (error) {
      expect(error).toMatchObject({ code: 'CONFLICT', status: 409 })

      const details = (error as { details?: Array<{ reason?: string; references?: Record<string, unknown> }> })
        .details?.[0]

      expect(details?.reason).toBe('MEDIA_IN_USE')
      expect(details?.references).toMatchObject({ total: 1 })
    }

    // 不解除关系、不动存储、不删 DB
    expect(storage.delete).not.toHaveBeenCalled()
    expect(prisma.media.delete).not.toHaveBeenCalled()
  })

  it('returns 404 MEDIA_NOT_FOUND for an unknown id', async () => {
    const { service, storage, prisma } = createHarness()

    prisma.media.findUnique.mockResolvedValue(null)

    await expect(service.remove('missing-id')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
    expect(storage.delete).not.toHaveBeenCalled()
  })
})

describe('MediaService.remove — deletion ordering and failures', () => {
  it('deletes the storage object first, then the DB row', async () => {
    const { service, storage, prisma } = createHarness()

    await expect(service.remove('media-1')).resolves.toEqual({ id: 'media-1', deleted: true })

    expect(storage.delete).toHaveBeenCalledWith(OBJECT_KEY)
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } })

    const storageOrder = storage.delete.mock.invocationCallOrder[0]!
    const dbOrder = prisma.media.delete.mock.invocationCallOrder[0]!

    expect(storageOrder).toBeLessThan(dbOrder)
  })

  it('keeps the DB row and returns 503 when storage deletion fails', async () => {
    const { service, storage, prisma } = createHarness()

    storage.delete.mockRejectedValue(new Error('ENOENT: E:\\secret\\path'))

    try {
      await service.remove('media-1')
      throw new Error('expected delete to fail')
    } catch (error) {
      expect(error).toMatchObject({ code: 'FILE_UPLOAD_ERROR', status: 503 })
      expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(
        'STORAGE_DELETE_FAILED',
      )
      // 不泄露本地路径
      expect((error as Error).message).not.toContain('secret')
    }

    expect(prisma.media.delete).not.toHaveBeenCalled()
  })

  it('logs a structured orphan risk when the DB delete fails and does not delete the object twice', async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const { service, storage, prisma } = createHarness()

    prisma.media.delete.mockRejectedValue(Object.assign(new Error('db down'), { code: 'P1001' }))

    await expect(service.remove('media-1')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 500,
    })

    expect(storage.delete).toHaveBeenCalledTimes(1)

    const payload = JSON.parse(loggerSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>

    expect(payload).toMatchObject({
      event: 'media.delete.db_failure',
      mediaId: 'media-1',
      objectKey: OBJECT_KEY,
    })
    expect(payload.databaseError).toMatchObject({ message: 'db down', code: 'P1001' })

    loggerSpy.mockRestore()
  })
})
