import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AppError } from '../../../common/errors/app-error.js'
import type { PrismaService } from '../../../prisma/prisma.service.js'
import { resolvePublishedAt } from '../shared/content-write.js'
import { AdminWorkService } from './admin-work.service.js'
import { AdminWorkQueryDto } from './dto/admin-work-query.dto.js'

const WORK_ID = '11111111-1111-4111-8111-111111111111'
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
const TAG_ID = '33333333-3333-4333-8333-333333333333'
const MEDIA_ID = '44444444-4444-4444-8444-444444444444'
const MEDIA_ID_2 = '55555555-5555-4555-8555-555555555555'

function makeQuery(overrides: Partial<AdminWorkQueryDto> = {}): AdminWorkQueryDto {
  return Object.assign(new AdminWorkQueryDto(), overrides)
}

const baseWork = {
  id: WORK_ID,
  slug: 'e2e-work',
  status: 'DRAFT' as const,
  featured: false,
  sortOrder: 0,
  coverMediaId: null,
  githubUrl: null,
  demoUrl: null,
  projectUrl: null,
  startDate: null,
  endDate: null,
  publishedAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  cover: null,
  translations: [],
  categories: [],
  tags: [],
  media: [],
}

function createHarness(overrides: Record<string, unknown> = {}) {
  const tx = {
    work: {
      create: vi.fn().mockResolvedValue({ id: WORK_ID }),
      update: vi.fn().mockResolvedValue({ id: WORK_ID }),
      delete: vi.fn().mockResolvedValue({ id: WORK_ID }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(baseWork),
    },
    workTranslation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    workCategory: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    workTag: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    workMedia: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    work: {
      findMany: vi.fn().mockResolvedValue([baseWork]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(baseWork),
      ...(overrides.work as object),
    },
  }

  return { prisma, tx, service: new AdminWorkService(prisma as unknown as PrismaService) }
}

describe('AdminWorkService.create', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('creates work, translations and relations inside one transaction', async () => {
    await harness.service.create({
      slug: 'e2e-work',
      status: 'DRAFT',
      featured: false,
      translations: [
        { locale: 'zh-CN', title: '中文标题' },
        { locale: 'en-US', title: 'English title' },
      ],
      categoryIds: [CATEGORY_ID],
      tagIds: [TAG_ID],
      mediaIds: [MEDIA_ID],
    })

    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(harness.tx.work.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'e2e-work', publishedAt: null }) }),
    )
    expect(harness.tx.workTranslation.createMany).toHaveBeenCalledTimes(1)
    expect(harness.tx.workTranslation.createMany.mock.calls[0]?.[0].data).toHaveLength(2)
    expect(harness.tx.workCategory.createMany).toHaveBeenCalledWith({
      data: [{ workId: WORK_ID, categoryId: CATEGORY_ID }],
    })
    expect(harness.tx.workTag.createMany).toHaveBeenCalledWith({ data: [{ workId: WORK_ID, tagId: TAG_ID }] })
    expect(harness.tx.workMedia.createMany).toHaveBeenCalledWith({
      data: [{ workId: WORK_ID, mediaId: MEDIA_ID, sortOrder: 0 }],
    })
  })

  it('sets publishedAt automatically when creating a PUBLISHED work', async () => {
    await harness.service.create({
      slug: 'e2e-work',
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '中文标题' }],
    })

    const data = harness.tx.work.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

    expect(data.publishedAt).toBeInstanceOf(Date)
  })

  it('maps slug unique violations to CONFLICT', async () => {
    const conflictHarness = createHarness()

    conflictHarness.tx.work.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    await expect(
      conflictHarness.service.create({
        slug: 'eson-web',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '重复' }],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('maps missing relations (P2003) to CONFLICT', async () => {
    const relationHarness = createHarness()

    relationHarness.tx.workCategory.createMany.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    )

    await expect(
      relationHarness.service.create({
        slug: 'e2e-work',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '中文标题' }],
        categoryIds: [CATEGORY_ID],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('AdminWorkService.update', () => {
  it('upserts translations and replaces relations', async () => {
    const harness = createHarness()

    await harness.service.update(WORK_ID, {
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'en-US', title: 'English title' }],
      categoryIds: [CATEGORY_ID],
      tagIds: [],
      mediaIds: [],
    })

    const updateData = harness.tx.work.update.mock.calls[0]?.[0].data as {
      status: string
      featured: boolean
      publishedAt: Date
    }

    expect(updateData.status).toBe('PUBLISHED')
    expect(updateData.featured).toBe(true)
    expect(updateData.publishedAt).toBeInstanceOf(Date)
    expect(harness.tx.workTranslation.upsert).toHaveBeenCalledTimes(1)
    // 关系为替换语义：先清理再写入
    expect(harness.tx.workCategory.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workCategory.createMany).toHaveBeenCalled()
    expect(harness.tx.workTag.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workTag.createMany).not.toHaveBeenCalled()
    expect(harness.tx.workMedia.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workMedia.createMany).not.toHaveBeenCalled()
  })

  it('keeps the existing publishedAt when unpublishing', async () => {
    const published = { ...baseWork, status: 'PUBLISHED' as const, publishedAt: new Date('2026-08-01T00:00:00.000Z') }
    const harness = createHarness({ work: { findUnique: vi.fn().mockResolvedValue(published) } })

    await harness.service.update(WORK_ID, { status: 'ARCHIVED' })

    const data = harness.tx.work.update.mock.calls[0]?.[0].data as { publishedAt: Date }

    expect(data.publishedAt.toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })

  it('throws NOT_FOUND for unknown ids', async () => {
    const harness = createHarness({ work: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.update(WORK_ID, { featured: true })).rejects.toBeInstanceOf(AppError)
  })
})

describe('AdminWorkService.remove', () => {
  it('cleans translations and join records, then deletes the work only', async () => {
    const harness = createHarness()

    const result = await harness.service.remove(WORK_ID)

    expect(result).toEqual({ id: WORK_ID, deleted: true })
    expect(harness.tx.workTranslation.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workCategory.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workTag.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.workMedia.deleteMany).toHaveBeenCalledWith({ where: { workId: WORK_ID } })
    expect(harness.tx.work.delete).toHaveBeenCalledWith({ where: { id: WORK_ID } })
    // Category / Tag / Media 本体没有被删除（tx 上没有对应 delete）
    expect(Object.keys(harness.tx)).not.toContain('category')
    expect(Object.keys(harness.tx)).not.toContain('tag')
    expect(Object.keys(harness.tx)).not.toContain('media')
  })
})

describe('AdminWorkService.list', () => {
  it('applies status, featured, search filters and pagination', async () => {
    const harness = createHarness()
    const query = makeQuery({
      page: 2,
      pageSize: 5,
      status: 'PUBLISHED',
      featured: 'true',
      search: 'eson',
    })

    const result = await harness.service.list(query)
    const args = harness.prisma.work.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>
      skip: number
      take: number
    }

    expect(args.where.status).toBe('PUBLISHED')
    expect(args.where.featured).toBe(true)
    expect(args.where.OR).toBeDefined()
    expect(args.skip).toBe(5)
    expect(args.take).toBe(5)
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 1, totalPages: 1 })
  })

  it('filters by category and tag slug', async () => {
    const harness = createHarness()

    await harness.service.list(makeQuery({ category: 'dev-tools', tag: 'nuxt' }))

    const args = harness.prisma.work.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }

    expect(args.where.categories).toEqual({ some: { category: { slug: 'dev-tools' } } })
    expect(args.where.tags).toEqual({ some: { tag: { slug: 'nuxt' } } })
  })

  it('defaults to updatedAt desc and honours the sort whitelist', async () => {
    const defaultHarness = createHarness()

    await defaultHarness.service.list(makeQuery())

    expect(defaultHarness.prisma.work.findMany.mock.calls[0]?.[0].orderBy).toEqual([{ updatedAt: 'desc' }])

    const sortedHarness = createHarness()

    await sortedHarness.service.list(makeQuery({ sort: 'publishedAt', order: 'desc' }))

    expect(sortedHarness.prisma.work.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ])
  })

  it('reports totalPages 0 for an empty result set', async () => {
    const harness = createHarness()

    harness.prisma.work.findMany.mockResolvedValue([])
    harness.prisma.work.count.mockResolvedValue(0)

    const result = await harness.service.list(makeQuery({ pageSize: 12 }))

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 })
  })
})

describe('AdminWorkService status / featured handling', () => {
  it('creates an ARCHIVED work without inventing publishedAt', async () => {
    const harness = createHarness()

    await harness.service.create({
      slug: 'archived-work',
      status: 'ARCHIVED',
      translations: [{ locale: 'zh-CN', title: '归档' }],
    })

    const data = harness.tx.work.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

    expect(data.publishedAt).toBeNull()
  })

  it('defaults featured to false and sortOrder to 0 when omitted', async () => {
    const harness = createHarness()

    await harness.service.create({
      slug: 'defaults',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '默认值' }],
    })

    const data = harness.tx.work.create.mock.calls[0]?.[0].data as { featured: boolean; sortOrder: number }

    expect(data.featured).toBe(false)
    expect(data.sortOrder).toBe(0)
  })

  it('accepts an explicit publishedAt when creating a PUBLISHED work', async () => {
    const harness = createHarness()

    await harness.service.create({
      slug: 'backdated',
      status: 'PUBLISHED',
      publishedAt: '2026-01-02',
      translations: [{ locale: 'zh-CN', title: '回填日期' }],
    })

    const data = harness.tx.work.create.mock.calls[0]?.[0].data as { publishedAt: Date }

    expect(data.publishedAt.toISOString().slice(0, 10)).toBe('2026-01-02')
  })

  it('can turn featured off again', async () => {
    const featured = { ...baseWork, featured: true }
    const harness = createHarness({ work: { findUnique: vi.fn().mockResolvedValue(featured) } })

    await harness.service.update(WORK_ID, { featured: false })

    const data = harness.tx.work.update.mock.calls[0]?.[0].data as { featured: boolean }

    expect(data.featured).toBe(false)
  })
})

describe('AdminWorkService error mapping', () => {
  it('maps slug conflicts on update to CONFLICT', async () => {
    const harness = createHarness()

    harness.tx.work.update.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    await expect(harness.service.update(WORK_ID, { slug: 'eson-web' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('maps unknown relations on update to CONFLICT', async () => {
    const harness = createHarness()

    harness.tx.workCategory.createMany.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    )

    await expect(
      harness.service.update(WORK_ID, { categoryIds: [CATEGORY_ID] }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('throws NOT_FOUND when removing an unknown work', async () => {
    const harness = createHarness({ work: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.remove(WORK_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('keeps media relation order in sync with the request array', async () => {
    const harness = createHarness()

    await harness.service.create({
      slug: 'gallery-order',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '图库' }],
      mediaIds: [MEDIA_ID_2, MEDIA_ID],
    })

    expect(harness.tx.workMedia.createMany).toHaveBeenCalledWith({
      data: [
        { workId: WORK_ID, mediaId: MEDIA_ID_2, sortOrder: 0 },
        { workId: WORK_ID, mediaId: MEDIA_ID, sortOrder: 1 },
      ],
    })
  })
})

describe('resolvePublishedAt', () => {
  it('fills the current time for PUBLISHED without a date', () => {
    const value = resolvePublishedAt('PUBLISHED', null)

    expect(value).toBeInstanceOf(Date)
  })

  it('never invents a date for DRAFT or ARCHIVED', () => {
    expect(resolvePublishedAt('DRAFT', null, null)).toBeNull()
    expect(resolvePublishedAt('ARCHIVED', null, null)).toBeNull()
  })

  it('preserves an existing date when unpublishing', () => {
    const existing = new Date('2026-05-05T00:00:00.000Z')

    expect(resolvePublishedAt('DRAFT', null, existing)?.toISOString()).toBe(existing.toISOString())
  })

  it('uses the provided publish date when given', () => {
    expect(resolvePublishedAt('PUBLISHED', '2026-01-02')?.toISOString().slice(0, 10)).toBe('2026-01-02')
  })
})
