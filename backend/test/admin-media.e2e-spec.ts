import { Logger, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'
import { MAX_UPLOAD_BYTES } from '../src/modules/media/image-inspection.js'
import { StorageService } from '../src/modules/media/storage.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import {
  REAL_PNG_1X1,
  avifImage,
  jpegImage,
  padTo,
  pngWithDimensions,
  randomBytes,
  webpImage,
} from './fixtures/image-fixtures.js'

/**
 * Admin Media API E2E（Phase 4-F.3）。
 *
 * 真实 PostgreSQL + LocalStorageDriver（MEDIA_LOCAL_ROOT 指向临时目录）+ 真实 multipart。
 * 覆盖：上传（4 种格式 + 校验失败）、列表分页、PATCH alt、DELETE 的 6 类引用保护、
 * 存储/DB 失败路径、匿名 401。
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

describeWithDatabase('Admin Media API (e2e)', () => {
  let app: import('@nestjs/common').INestApplication
  let token = ''
  let storageRoot = ''
  let storage: StorageService
  let prisma: PrismaService

  const createdMediaIds: string[] = []
  const createdContentIds: Array<{ model: 'work' | 'lab' | 'writing'; id: string }> = []

  const api = () => request(app.getHttpServer())
  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', url: string) =>
    (api() as unknown as Record<string, (url: string) => request.Test>)[method](url).set(
      'Authorization',
      `Bearer ${token}`,
    )

  async function uploadMedia(
    buffer: Buffer,
    options: { filename?: string; contentType?: string; alt?: string } = {},
  ) {
    let call = asAdmin('post', '/api/v1/admin/media').attach('file', buffer, {
      filename: options.filename ?? 'upload.png',
      contentType: options.contentType ?? 'image/png',
    })

    if (options.alt !== undefined) {
      call = call.field('alt', options.alt)
    }

    const response = await call

    if (response.status === 201) {
      createdMediaIds.push(response.body.data.id)
    }

    return response
  }

  /** 创建引用 media 的内容行（cover 或 gallery），返回内容 id */
  async function createContentWithMedia(
    model: 'work' | 'lab' | 'writing',
    mediaId: string,
    usage: 'cover' | 'gallery',
  ): Promise<string> {
    const slug = uniqueSlug(`e2e-media-${usage}`)

    if (model === 'work') {
      const row =
        usage === 'cover'
          ? await prisma.work.create({ data: { slug, status: 'DRAFT', coverMediaId: mediaId } })
          : await prisma.work.create({ data: { slug, status: 'DRAFT' } })

      if (usage === 'gallery') {
        await prisma.workMedia.create({ data: { workId: row.id, mediaId } })
      }

      createdContentIds.push({ model, id: row.id })
      return row.id
    }

    if (model === 'lab') {
      const row =
        usage === 'cover'
          ? await prisma.lab.create({ data: { slug, status: 'DRAFT', coverMediaId: mediaId } })
          : await prisma.lab.create({ data: { slug, status: 'DRAFT' } })

      if (usage === 'gallery') {
        await prisma.labMedia.create({ data: { labId: row.id, mediaId } })
      }

      createdContentIds.push({ model, id: row.id })
      return row.id
    }

    const row =
      usage === 'cover'
        ? await prisma.writing.create({ data: { slug, status: 'DRAFT', coverMediaId: mediaId } })
        : await prisma.writing.create({ data: { slug, status: 'DRAFT' } })

    if (usage === 'gallery') {
      await prisma.writingMedia.create({ data: { writingId: row.id, mediaId } })
    }

    createdContentIds.push({ model, id: row.id })
    return row.id
  }

  async function deleteContent(model: 'work' | 'lab' | 'writing', id: string): Promise<void> {
    if (model === 'work') {
      await prisma.work.delete({ where: { id } })
      return
    }

    if (model === 'lab') {
      await prisma.lab.delete({ where: { id } })
      return
    }

    await prisma.writing.delete({ where: { id } })
  }

  function objectKeyFromUrl(url: string): string {
    return new URL(url).pathname.replace(/^\//, '')
  }

  function uniqueSlug(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
  }

  beforeAll(async () => {
    storageRoot = await mkdtemp(path.join(tmpdir(), 'eson-media-e2e-'))
    process.env.STORAGE_DRIVER = 'local'
    process.env.MEDIA_LOCAL_ROOT = storageRoot

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    storage = app.get(StorageService)
    prisma = app.get(PrismaService)

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'dev-only-password' })

    token = login.body.data.accessToken
  })

  afterAll(async () => {
    for (const entry of createdContentIds) {
      await deleteContent(entry.model, entry.id).catch(() => undefined)
    }

    for (const id of createdMediaIds) {
      await prisma.media.delete({ where: { id } }).catch(() => undefined)
    }

    await app?.close()
    await rm(storageRoot, { recursive: true, force: true })
    delete process.env.MEDIA_LOCAL_ROOT
  })

  it('rejects anonymous access to every admin media endpoint', async () => {
    const list = await api().get('/api/v1/admin/media')
    const upload = await api().post('/api/v1/admin/media').attach('file', REAL_PNG_1X1, 'x.png')
    const patch = await api().patch('/api/v1/admin/media/11111111-1111-4111-8111-111111111111').send({})
    const remove = await api().delete('/api/v1/admin/media/11111111-1111-4111-8111-111111111111')

    for (const response of [list, upload, patch, remove]) {
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  describe('POST /api/v1/admin/media', () => {
    it('uploads a PNG and persists both the storage object and the DB row', async () => {
      const response = await uploadMedia(pngWithDimensions(1600, 900), {
        filename: 'cover.png',
        contentType: 'image/png',
        alt: '封面',
      })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        filename: 'cover.png',
        originalFilename: 'cover.png',
        mimeType: 'image/png',
        width: 1600,
        height: 900,
        alt: '封面',
        provider: 'local',
      })
      // 不暴露 storageKey / 磁盘路径
      expect(response.body.data).not.toHaveProperty('storageKey')
      expect(JSON.stringify(response.body.data)).not.toContain(storageRoot)

      const objectKey = objectKeyFromUrl(response.body.data.url)

      expect(objectKey).toMatch(/^media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/)
      await expect(storage.exists(objectKey)).resolves.toBe(true)

      const row = await prisma.media.findUnique({ where: { id: response.body.data.id } })

      expect(row).toMatchObject({ storageKey: objectKey, mimeType: 'image/png', width: 1600, height: 900 })
    })

    it('accepts every allowed image format', async () => {
      const cases: Array<[string, Buffer, string, string]> = [
        ['jpeg', jpegImage(4000, 3000), 'photo.jpg', 'image/jpeg'],
        ['webp', webpImage(800, 600), 'shot.webp', 'image/webp'],
        ['avif', avifImage(2000, 1000), 'hero.avif', 'image/avif'],
      ]

      for (const [label, buffer, filename, contentType] of cases) {
        const response = await uploadMedia(buffer, { filename, contentType })

        expect(response.status, `${label} should upload`).toBe(201)
        expect(response.body.data.mimeType).toBe(contentType)
      }
    })

    it('rejects invalid content, mismatches and oversized images with stable reasons', async () => {
      const cases: Array<[string, Buffer, { filename: string; contentType: string }, string]> = [
        ['invalid signature', randomBytes(128), { filename: 'fake.png', contentType: 'image/png' }, 'SIGNATURE_MISMATCH'],
        ['mime mismatch', pngWithDimensions(10, 10), { filename: 'fake.jpg', contentType: 'image/jpeg' }, 'MIME_MISMATCH'],
        ['extension mismatch', pngWithDimensions(10, 10), { filename: 'cover.jpg', contentType: 'image/png' }, 'EXTENSION_MISMATCH'],
        ['disallowed mime', REAL_PNG_1X1, { filename: 'cover.gif', contentType: 'image/gif' }, 'MIME_NOT_ALLOWED'],
        ['disallowed extension', REAL_PNG_1X1, { filename: 'cover.svg', contentType: 'image/png' }, 'EXTENSION_NOT_ALLOWED'],
        ['svg content', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), { filename: 'x.svg', contentType: 'image/svg+xml' }, 'MIME_NOT_ALLOWED'],
        ['over 40MP', pngWithDimensions(10000, 4001), { filename: 'huge.png', contentType: 'image/png' }, 'IMAGE_TOO_LARGE'],
      ]

      for (const [label, buffer, options, reason] of cases) {
        const response = await uploadMedia(buffer, options)

        expect(response.status, `${label} should be rejected`).toBe(422)
        expect(response.body.error.code).toBe('FILE_UPLOAD_ERROR')
        expect(response.body.error.details[0].reason).toBe(reason)
      }
    })

    it('rejects files above the 10MB transport limit', async () => {
      const response = await uploadMedia(padTo(pngWithDimensions(100, 100), MAX_UPLOAD_BYTES + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      })

      expect(response.status).toBe(422)
      expect(response.body.error.code).toBe('FILE_UPLOAD_ERROR')
      expect(response.body.error.details[0].reason).toBe('FILE_TOO_LARGE')
    })

    it('reports a missing file as FILE_MISSING', async () => {
      const response = await asAdmin('post', '/api/v1/admin/media').field('alt', 'no file')

      expect(response.status).toBe(400)
      expect(response.body.error.details[0].reason).toBe('FILE_MISSING')
    })

    it('rejects client-supplied storage fields', async () => {
      for (const body of [
        { storageKey: 'media/2026/09/attacker.png' },
        { url: 'https://evil.example.com/x.png' },
        { mimeType: 'image/svg+xml' },
        { size: 1 },
        { width: 1, height: 1 },
      ]) {
        const response = await asAdmin('post', '/api/v1/admin/media')
          .attach('file', REAL_PNG_1X1, { filename: 'x.png', contentType: 'image/png' })
          .field('storageKey', String(body.storageKey ?? body.url ?? body.mimeType ?? body.size ?? body.width))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      }
    })

    it('compensates the storage object when the DB insert fails', async () => {
      const putSpy = vi.spyOn(storage, 'put')

      vi.spyOn(prisma.media, 'create').mockRejectedValueOnce(new Error('simulated db failure'))

      const response = await uploadMedia(REAL_PNG_1X1, {
        filename: 'compensate.png',
        contentType: 'image/png',
      })

      expect(response.status).toBe(500)
      expect(response.body.error.code).toBe('FILE_UPLOAD_ERROR')
      expect(response.body.error.details[0].reason).toBe('DATABASE_ERROR')

      const objectKey = putSpy.mock.calls[0]?.[0].key as string

      await expect(storage.exists(objectKey)).resolves.toBe(false)

      putSpy.mockRestore()
    })
  })

  describe('GET /api/v1/admin/media', () => {
    it('returns a paginated library with admin metadata and no storage paths', async () => {
      const response = await asAdmin('get', '/api/v1/admin/media?page=1&pageSize=2').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.meta).toMatchObject({ page: 1, pageSize: 2 })
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2)
      expect(response.body.data.length).toBeLessThanOrEqual(2)

      for (const item of response.body.data as Array<Record<string, unknown>>) {
        expect(typeof item.id).toBe('string')
        expect(typeof item.url).toBe('string')
        expect(typeof item.mimeType).toBe('string')
        expect(item).not.toHaveProperty('storageKey')
        expect(item).not.toHaveProperty('metadata')
      }

      expect(JSON.stringify(response.body.data)).not.toContain(storageRoot)
    })

    it('defaults to a 100-item page and validates pagination bounds', async () => {
      const response = await asAdmin('get', '/api/v1/admin/media').expect(200)

      expect(response.body.meta.pageSize).toBe(100)

      const tooLarge = await asAdmin('get', '/api/v1/admin/media?pageSize=101')

      expect(tooLarge.status).toBe(400)
      expect(tooLarge.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PATCH /api/v1/admin/media/:id', () => {
    it('updates alt and the change is visible in the list', async () => {
      const created = await uploadMedia(REAL_PNG_1X1, { filename: 'patch.png', contentType: 'image/png' })
      const id = created.body.data.id as string

      const patched = await asAdmin('patch', `/api/v1/admin/media/${id}`).send({ alt: '  新 alt  ' })

      expect(patched.status).toBe(200)
      expect(patched.body.data.alt).toBe('新 alt')

      const list = await asAdmin('get', '/api/v1/admin/media?pageSize=100').expect(200)
      const item = (list.body.data as Array<{ id: string; alt: string | null }>).find((entry) => entry.id === id)

      expect(item?.alt).toBe('新 alt')

      const cleared = await asAdmin('patch', `/api/v1/admin/media/${id}`).send({ alt: null })

      expect(cleared.status).toBe(200)
      expect(cleared.body.data.alt).toBeNull()
    })

    it('rejects immutable storage fields and invalid alt', async () => {
      const created = await uploadMedia(REAL_PNG_1X1, { filename: 'immutable.png', contentType: 'image/png' })
      const id = created.body.data.id as string

      for (const body of [
        { storageKey: 'media/2026/09/attacker.png' },
        { url: 'https://evil.example.com/x.png' },
        { mimeType: 'image/svg+xml' },
        { provider: 's3' },
      ]) {
        const response = await asAdmin('patch', `/api/v1/admin/media/${id}`).send(body)

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      }

      const tooLong = await asAdmin('patch', `/api/v1/admin/media/${id}`).send({ alt: 'a'.repeat(501) })

      expect(tooLong.status).toBe(400)

      // 原有数据未被破坏
      const row = await prisma.media.findUnique({ where: { id } })

      expect(row?.storageKey).toBe(objectKeyFromUrl(created.body.data.url))
    })

    it('returns 404 MEDIA_NOT_FOUND and 400 for invalid ids', async () => {
      const missing = await asAdmin('patch', '/api/v1/admin/media/11111111-1111-4111-8111-111111111111').send({
        alt: 'x',
      })

      expect(missing.status).toBe(404)
      expect(missing.body.error.code).toBe('NOT_FOUND')
      expect(missing.body.error.details[0].reason).toBe('MEDIA_NOT_FOUND')

      const invalid = await asAdmin('patch', '/api/v1/admin/media/not-a-uuid').send({ alt: 'x' })

      expect(invalid.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/admin/media/:id', () => {
    it('deletes an unreferenced media: storage object first, then the DB row', async () => {
      const created = await uploadMedia(REAL_PNG_1X1, { filename: 'delete.png', contentType: 'image/png' })
      const id = created.body.data.id as string
      const objectKey = objectKeyFromUrl(created.body.data.url)

      const deleteSpy = vi.spyOn(storage, 'delete')

      const deleted = await asAdmin('delete', `/api/v1/admin/media/${id}`).expect(200)

      expect(deleted.body.data).toEqual({ id, deleted: true })
      expect(deleteSpy).toHaveBeenCalledWith(objectKey)
      await expect(storage.exists(objectKey)).resolves.toBe(false)
      await expect(prisma.media.findUnique({ where: { id } })).resolves.toBeNull()

      deleteSpy.mockRestore()
      createdMediaIds.splice(createdMediaIds.indexOf(id), 1)
    })

    it('returns 404 for unknown ids and 400 for invalid ids', async () => {
      const missing = await asAdmin('delete', '/api/v1/admin/media/11111111-1111-4111-8111-111111111111')

      expect(missing.status).toBe(404)
      expect(missing.body.error.details[0].reason).toBe('MEDIA_NOT_FOUND')

      const invalid = await asAdmin('delete', '/api/v1/admin/media/not-a-uuid')

      expect(invalid.status).toBe(400)
    })

    it('blocks deletion while the media is referenced (all six reference paths)', async () => {
      const scenarios = [
        'work_media',
        'lab_media',
        'writing_media',
        'works.coverMediaId',
        'labs.coverMediaId',
        'writings.coverMediaId',
      ] as const

      for (const scenario of scenarios) {
        const created = await uploadMedia(REAL_PNG_1X1, { filename: `ref-${scenario}.png`, contentType: 'image/png' })
        const mediaId = created.body.data.id as string

        const isCover = scenario.endsWith('.coverMediaId')
        const model = scenario.replace('.coverMediaId', '').replace('_media', '') as
          | 'work'
          | 'lab'
          | 'writing'

        await createContentWithMedia(model, mediaId, isCover ? 'cover' : 'gallery')

        const blocked = await asAdmin('delete', `/api/v1/admin/media/${mediaId}`)

        expect(blocked.status, `${scenario} should block deletion`).toBe(409)
        expect(blocked.body.error.code).toBe('CONFLICT')
        expect(blocked.body.error.details[0].reason).toBe('MEDIA_IN_USE')
        expect(blocked.body.error.details[0].references.total).toBe(1)

        // media 行仍然存在（未被静默删除，也未解除关系）
        await expect(prisma.media.findUnique({ where: { id: mediaId } })).resolves.not.toBeNull()
      }
    })

    it('keeps the DB row and returns 503 when storage deletion fails', async () => {
      const created = await uploadMedia(REAL_PNG_1X1, { filename: 'storage-fail.png', contentType: 'image/png' })
      const id = created.body.data.id as string

      const deleteSpy = vi.spyOn(storage, 'delete').mockRejectedValueOnce(new Error('storage down'))
      const dbDeleteSpy = vi.spyOn(prisma.media, 'delete')

      const response = await asAdmin('delete', `/api/v1/admin/media/${id}`)

      expect(response.status).toBe(503)
      expect(response.body.error.code).toBe('FILE_UPLOAD_ERROR')
      expect(response.body.error.details[0].reason).toBe('STORAGE_DELETE_FAILED')
      expect(JSON.stringify(response.body)).not.toContain(storageRoot)

      expect(dbDeleteSpy).not.toHaveBeenCalled()
      await expect(prisma.media.findUnique({ where: { id } })).resolves.not.toBeNull()

      deleteSpy.mockRestore()
      dbDeleteSpy.mockRestore()
    })

    it('logs a structured orphan risk when the DB delete fails after the object is gone', async () => {
      const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
      const created = await uploadMedia(REAL_PNG_1X1, { filename: 'db-fail.png', contentType: 'image/png' })
      const id = created.body.data.id as string
      const objectKey = objectKeyFromUrl(created.body.data.url)

      const dbDeleteSpy = vi
        .spyOn(prisma.media, 'delete')
        .mockRejectedValueOnce(Object.assign(new Error('db down'), { code: 'P1001' }))

      const response = await asAdmin('delete', `/api/v1/admin/media/${id}`)

      expect(response.status).toBe(500)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
      expect(response.body.error.details[0].reason).toBe('DATABASE_ERROR')
      expect(JSON.stringify(response.body)).not.toContain('db down')

      // 存储对象已删除（不再二次删除），DB 行仍在 → 需要人工/后续阶段处理
      await expect(storage.exists(objectKey)).resolves.toBe(false)
      await expect(prisma.media.findUnique({ where: { id } })).resolves.not.toBeNull()

      const payload = JSON.parse(loggerSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>

      expect(payload).toMatchObject({ event: 'media.delete.db_failure', mediaId: id, objectKey })
      expect(payload.databaseError).toMatchObject({ message: 'db down', code: 'P1001' })

      loggerSpy.mockRestore()
      dbDeleteSpy.mockRestore()
    })
  })
})
