import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../../../prisma/prisma.service.js'
import { AdminLabService } from './admin-lab.service.js'
import { AdminLabQueryDto } from './dto/admin-lab-query.dto.js'

const LAB_ID = '11111111-1111-4111-8111-111111111111'
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
const TAG_ID = '33333333-3333-4333-8333-333333333333'
const MEDIA_ID = '44444444-4444-4444-8444-444444444444'
const MEDIA_ID_2 = '55555555-5555-4555-8555-555555555555'

function makeQuery(overrides: Partial<AdminLabQueryDto> = {}): AdminLabQueryDto {
  return Object.assign(new AdminLabQueryDto(), overrides)
}

const baseLab = {
  id: LAB_ID,
  slug: 'e2e-lab',
  status: 'DRAFT' as const,
  featured: false,
  sortOrder: 0,
  coverMediaId: null,
  githubUrl: null,
  demoUrl: null,
  projectUrl: null,
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
    lab: {
      create: vi.fn().mockResolvedValue({ id: LAB_ID }),
      update: vi.fn().mockResolvedValue({ id: LAB_ID }),
      delete: vi.fn().mockResolvedValue({ id: LAB_ID }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(baseLab),
    },
    labTranslation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    labCategory: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    labTag: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    labMedia: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    lab: {
      findMany: vi.fn().mockResolvedValue([baseLab]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(baseLab),
      ...(overrides.lab as object),
    },
  }

  return { prisma, tx, service: new AdminLabService(prisma as unknown as PrismaService) }
}

describe('AdminLabService.create', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('creates lab, translations and relations inside one transaction', async () => {
    await harness.service.create({
      slug: 'e2e-lab',
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
    expect(harness.tx.lab.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'e2e-lab', publishedAt: null }) }),
    )
    expect(harness.tx.labTranslation.createMany).toHaveBeenCalledTimes(1)
    expect(harness.tx.labTranslation.createMany.mock.calls[0]?.[0].data).toHaveLength(2)
    expect(harness.tx.labCategory.createMany).toHaveBeenCalledWith({
      data: [{ labId: LAB_ID, categoryId: CATEGORY_ID }],
    })
    expect(harness.tx.labTag.createMany).toHaveBeenCalledWith({ data: [{ labId: LAB_ID, tagId: TAG_ID }] })
    expect(harness.tx.labMedia.createMany).toHaveBeenCalledWith({
      data: [{ labId: LAB_ID, mediaId: MEDIA_ID, sortOrder: 0 }],
    })
  })

  it('sets publishedAt automatically when creating a PUBLISHED lab', async () => {
    await harness.service.create({
      slug: 'e2e-lab',
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '中文标题' }],
    })

    const data = harness.tx.lab.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

    expect(data.publishedAt).toBeInstanceOf(Date)
  })

  it('never invents publishedAt for DRAFT or ARCHIVED', async () => {
    for (const status of ['DRAFT', 'ARCHIVED'] as const) {
      const scoped = createHarness()

      await scoped.service.create({
        slug: 'e2e-lab',
        status,
        translations: [{ locale: 'zh-CN', title: '中文标题' }],
      })

      const data = scoped.tx.lab.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

      expect(data.publishedAt).toBeNull()
    }
  })

  it('maps slug unique violations to CONFLICT', async () => {
    const conflictHarness = createHarness()

    conflictHarness.tx.lab.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    await expect(
      conflictHarness.service.create({
        slug: 'agent-workflow-prototype',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '重复' }],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('maps missing relations (P2003) to CONFLICT', async () => {
    const relationHarness = createHarness()

    relationHarness.tx.labCategory.createMany.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    )

    await expect(
      relationHarness.service.create({
        slug: 'e2e-lab',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '中文标题' }],
        categoryIds: [CATEGORY_ID],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('AdminLabService.update', () => {
  it('upserts translations and replaces relations', async () => {
    const harness = createHarness()

    await harness.service.update(LAB_ID, {
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'en-US', title: 'English title' }],
      categoryIds: [CATEGORY_ID],
      tagIds: [],
      mediaIds: [],
    })

    const updateData = harness.tx.lab.update.mock.calls[0]?.[0].data as {
      status: string
      featured: boolean
      publishedAt: Date
    }

    expect(updateData.status).toBe('PUBLISHED')
    expect(updateData.featured).toBe(true)
    expect(updateData.publishedAt).toBeInstanceOf(Date)
    expect(harness.tx.labTranslation.upsert).toHaveBeenCalledTimes(1)
    expect(harness.tx.labCategory.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labCategory.createMany).toHaveBeenCalled()
    expect(harness.tx.labTag.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labTag.createMany).not.toHaveBeenCalled()
    expect(harness.tx.labMedia.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labMedia.createMany).not.toHaveBeenCalled()
  })

  it('keeps the existing publishedAt when unpublishing', async () => {
    const published = {
      ...baseLab,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
    }
    const harness = createHarness({ lab: { findUnique: vi.fn().mockResolvedValue(published) } })

    await harness.service.update(LAB_ID, { status: 'ARCHIVED' })

    const data = harness.tx.lab.update.mock.calls[0]?.[0].data as { publishedAt: Date }

    expect(data.publishedAt.toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })

  it('keeps media order in sync with the request array', async () => {
    const harness = createHarness()

    await harness.service.create({
      slug: 'gallery-order',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '图库' }],
      mediaIds: [MEDIA_ID_2, MEDIA_ID],
    })

    expect(harness.tx.labMedia.createMany).toHaveBeenCalledWith({
      data: [
        { labId: LAB_ID, mediaId: MEDIA_ID_2, sortOrder: 0 },
        { labId: LAB_ID, mediaId: MEDIA_ID, sortOrder: 1 },
      ],
    })
  })

  it('maps slug conflicts on update to CONFLICT', async () => {
    const harness = createHarness()

    harness.tx.lab.update.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    await expect(harness.service.update(LAB_ID, { slug: 'taken' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('throws NOT_FOUND for unknown ids', async () => {
    const harness = createHarness({ lab: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.update(LAB_ID, { featured: true })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })
})

describe('AdminLabService.remove', () => {
  it('cleans translations and join records, then deletes the lab only', async () => {
    const harness = createHarness()

    const result = await harness.service.remove(LAB_ID)

    expect(result).toEqual({ id: LAB_ID, deleted: true })
    expect(harness.tx.labTranslation.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labCategory.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labTag.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.labMedia.deleteMany).toHaveBeenCalledWith({ where: { labId: LAB_ID } })
    expect(harness.tx.lab.delete).toHaveBeenCalledWith({ where: { id: LAB_ID } })
    // Category / Tag / Media 本体没有被删除（tx 上没有对应 delete）
    expect(Object.keys(harness.tx)).not.toContain('category')
    expect(Object.keys(harness.tx)).not.toContain('tag')
    expect(Object.keys(harness.tx)).not.toContain('media')
  })

  it('throws NOT_FOUND when removing an unknown lab', async () => {
    const harness = createHarness({ lab: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.remove(LAB_ID)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('AdminLabService.list', () => {
  it('applies status, featured, search filters and pagination', async () => {
    const harness = createHarness()
    const query = makeQuery({
      page: 2,
      pageSize: 5,
      status: 'PUBLISHED',
      featured: 'true',
      search: 'agent',
    })

    const result = await harness.service.list(query)
    const args = harness.prisma.lab.findMany.mock.calls[0]?.[0] as {
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

  it('filters by category and tag slug and defaults to updatedAt desc', async () => {
    const harness = createHarness()

    await harness.service.list(makeQuery({ category: 'ai-systems', tag: 'llm' }))

    const args = harness.prisma.lab.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>
      orderBy: unknown
    }

    expect(args.where.categories).toEqual({ some: { category: { slug: 'ai-systems' } } })
    expect(args.where.tags).toEqual({ some: { tag: { slug: 'llm' } } })
    expect(args.orderBy).toEqual([{ updatedAt: 'desc' }])
  })

  it('reports totalPages 0 for an empty result set', async () => {
    const harness = createHarness()

    harness.prisma.lab.findMany.mockResolvedValue([])
    harness.prisma.lab.count.mockResolvedValue(0)

    const result = await harness.service.list(makeQuery())

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 })
  })
})
