import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/**
 * Public Gallery Data Pipeline（Phase 4-F.6.1，需要真实 PostgreSQL）。
 *
 * 覆盖：public detail 的 gallery 数据与顺序（sort_order ASC）、caption null、
 * media metadata、以及 list API 不携带 gallery。
 * 本阶段只做 Work + Lab（Writing 未实现）。
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

describeWithDatabase('Public Gallery pipeline (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const createdWorkIds: string[] = []
  const createdLabIds: string[] = []
  const createdMediaIds: string[] = []

  const api = () => request(app.getHttpServer())

  async function createMedia(label: string, overrides: Record<string, unknown> = {}) {
    const media = await prisma.media.create({
      data: {
        // 私有存储路径：绝不能出现在任何 public response 中
        storageKey: `private-storage-key/${label}.png`,
        url: `http://localhost:3001/media/qa-gallery/${label}.png`,
        filename: `${label}.png`,
        originalFilename: `${label}.png`,
        mimeType: 'image/png',
        size: 2048,
        width: 1600,
        height: 900,
        alt: `${label} alt`,
        ...overrides,
      },
    })

    createdMediaIds.push(media.id)

    return media
  }

  async function createPublishedWork(slug: string) {
    const work = await prisma.work.create({
      data: {
        slug,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        translations: {
          create: [{ locale: 'zh-CN', title: 'E2E gallery work', summary: 'summary' }],
        },
      },
    })

    createdWorkIds.push(work.id)

    return work.id
  }

  async function createPublishedLab(slug: string) {
    const lab = await prisma.lab.create({
      data: {
        slug,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        translations: {
          create: [{ locale: 'zh-CN', title: 'E2E gallery lab', summary: 'summary' }],
        },
      },
    })

    createdLabIds.push(lab.id)

    return lab.id
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    // 先删内容（join 行随 Cascade 清理），再删 QA media；不触碰 seed 数据
    if (createdWorkIds.length > 0) {
      await prisma.work.deleteMany({ where: { id: { in: createdWorkIds } } })
    }

    if (createdLabIds.length > 0) {
      await prisma.lab.deleteMany({ where: { id: { in: createdLabIds } } })
    }

    if (createdMediaIds.length > 0) {
      await prisma.media.deleteMany({ where: { id: { in: createdMediaIds } } })
    }

    await app?.close()
  })

  describe('Work detail gallery', () => {
    it('returns an empty gallery array when the work has no gallery relations', async () => {
      const slug = uniqueSlug('e2e-gallery-empty')

      await createPublishedWork(slug)

      const response = await api().get(`/api/v1/work/${slug}`).expect(200)

      expect(response.body.data.gallery).toEqual([])
    })

    it('returns one gallery entry with public-safe media metadata', async () => {
      const slug = uniqueSlug('e2e-gallery-one')
      const media = await createMedia('one')
      const workId = await createPublishedWork(slug)

      await prisma.workMedia.create({ data: { workId, mediaId: media.id, sortOrder: 0 } })

      const response = await api().get(`/api/v1/work/${slug}`).expect(200)
      const [item] = response.body.data.gallery as Array<Record<string, unknown>>

      expect(response.body.data.gallery).toHaveLength(1)
      expect(item).toMatchObject({
        id: media.id,
        caption: null,
        sortOrder: 0,
        media: {
          url: media.url,
          alt: 'one alt',
          width: 1600,
          height: 900,
        },
      })
      // 只暴露公开字段
      const serialized = JSON.stringify(response.body.data.gallery)

      expect(item).not.toHaveProperty('storageKey')
      expect(serialized).not.toContain('storageKey')
      expect(serialized).not.toContain('private-storage-key')
    })

    it('orders the gallery by sortOrder ascending regardless of insert order', async () => {
      const slug = uniqueSlug('e2e-gallery-order')
      const first = await createMedia('order-a')
      const second = await createMedia('order-b')
      const third = await createMedia('order-c')
      const workId = await createPublishedWork(slug)

      // 故意乱序写入：sort_order 2 / 0 / 1
      await prisma.workMedia.create({ data: { workId, mediaId: second.id, sortOrder: 2 } })
      await prisma.workMedia.create({ data: { workId, mediaId: third.id, sortOrder: 0 } })
      await prisma.workMedia.create({ data: { workId, mediaId: first.id, sortOrder: 1 } })

      const response = await api().get(`/api/v1/work/${slug}`).expect(200)
      const gallery = response.body.data.gallery as Array<{ id: string; sortOrder: number }>

      expect(gallery.map((item) => item.sortOrder)).toEqual([0, 1, 2])
      expect(gallery.map((item) => item.id)).toEqual([third.id, first.id, second.id])
    })

    it('keeps the cover media in the gallery when both reference the same media', async () => {
      const slug = uniqueSlug('e2e-gallery-cover')
      const media = await createMedia('cover-shared')
      const workId = await createPublishedWork(slug)

      await prisma.work.update({ where: { id: workId }, data: { coverMediaId: media.id } })
      await prisma.workMedia.create({ data: { workId, mediaId: media.id, sortOrder: 0 } })

      const response = await api().get(`/api/v1/work/${slug}`).expect(200)

      expect(response.body.data.cover.url).toBe(media.url)
      expect(response.body.data.gallery).toHaveLength(1)
      expect(response.body.data.gallery[0].id).toBe(media.id)
    })

    it('never adds a gallery to the work list response', async () => {
      const response = await api().get('/api/v1/work?pageSize=100').expect(200)
      const items = response.body.data as Array<Record<string, unknown>>

      expect(items.length).toBeGreaterThan(0)
      expect(items.every((item) => item.gallery === undefined)).toBe(true)
      expect(items.every((item) => item.media === undefined)).toBe(true)
    })
  })

  describe('Lab detail gallery', () => {
    it('returns an empty gallery array when the lab has no gallery relations', async () => {
      const slug = uniqueSlug('e2e-gallery-lab-empty')

      await createPublishedLab(slug)

      const response = await api().get(`/api/v1/lab/${slug}`).expect(200)

      expect(response.body.data.gallery).toEqual([])
    })

    it('orders the lab gallery by sortOrder ascending and keeps metadata', async () => {
      const slug = uniqueSlug('e2e-gallery-lab-order')
      const first = await createMedia('lab-a')
      const second = await createMedia('lab-b')
      const labId = await createPublishedLab(slug)

      await prisma.labMedia.create({ data: { labId, mediaId: first.id, sortOrder: 4 } })
      await prisma.labMedia.create({ data: { labId, mediaId: second.id, sortOrder: 1 } })

      const response = await api().get(`/api/v1/lab/${slug}`).expect(200)
      const gallery = response.body.data.gallery as Array<Record<string, unknown>>

      expect(gallery.map((item) => item.sortOrder)).toEqual([1, 4])
      expect(gallery[0]).toMatchObject({
        id: second.id,
        caption: null,
        media: { url: second.url, alt: 'lab-b alt', width: 1600, height: 900 },
      })
    })

    it('never adds a gallery to the lab list response', async () => {
      const response = await api().get('/api/v1/lab?pageSize=100').expect(200)
      const items = response.body.data as Array<Record<string, unknown>>

      expect(items.length).toBeGreaterThan(0)
      expect(items.every((item) => item.gallery === undefined)).toBe(true)
    })
  })
})
