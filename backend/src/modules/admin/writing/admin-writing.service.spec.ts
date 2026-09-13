import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../../../prisma/prisma.service.js'
import { AdminWritingService } from './admin-writing.service.js'
import { AdminWritingQueryDto } from './dto/admin-writing-query.dto.js'

const WRITING_ID = '11111111-1111-4111-8111-111111111111'
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
const TAG_ID = '33333333-3333-4333-8333-333333333333'
const MEDIA_ID = '44444444-4444-4444-8444-444444444444'

const MARKDOWN = [
  '# Heading',
  '',
  'A paragraph with **bold** text and `inline code`.',
  '',
  '- item one',
  '- item two',
  '',
  '```js',
  'const hello = "world"',
  '```',
].join('\n')

function makeQuery(overrides: Partial<AdminWritingQueryDto> = {}): AdminWritingQueryDto {
  return Object.assign(new AdminWritingQueryDto(), overrides)
}

const baseWriting = {
  id: WRITING_ID,
  slug: 'e2e-writing',
  status: 'DRAFT' as const,
  featured: false,
  sortOrder: 0,
  coverMediaId: null,
  publishedAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  cover: null,
  translations: [
    {
      locale: 'zh-CN',
      title: '中文标题',
      subtitle: null,
      excerpt: '摘要',
      content: MARKDOWN,
      seoTitle: null,
      seoDescription: null,
    },
  ],
  categories: [],
  tags: [],
  media: [],
}

function createHarness(overrides: Record<string, unknown> = {}) {
  const tx = {
    writing: {
      create: vi.fn().mockResolvedValue({ id: WRITING_ID }),
      update: vi.fn().mockResolvedValue({ id: WRITING_ID }),
      delete: vi.fn().mockResolvedValue({ id: WRITING_ID }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(baseWriting),
    },
    writingTranslation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    writingCategory: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    writingTag: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    writingMedia: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    writing: {
      findMany: vi.fn().mockResolvedValue([baseWriting]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(baseWriting),
      ...(overrides.writing as object),
    },
  }

  return { prisma, tx, service: new AdminWritingService(prisma as unknown as PrismaService) }
}

describe('AdminWritingService.create', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('creates writing, translations and relations inside one transaction', async () => {
    await harness.service.create({
      slug: 'e2e-writing',
      status: 'DRAFT',
      featured: false,
      translations: [
        { locale: 'zh-CN', title: '中文标题', excerpt: '摘要', content: MARKDOWN },
        { locale: 'en-US', title: 'English title' },
      ],
      categoryIds: [CATEGORY_ID],
      tagIds: [TAG_ID],
      mediaIds: [MEDIA_ID],
    })

    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(harness.tx.writing.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'e2e-writing', publishedAt: null }) }),
    )
    expect(harness.tx.writingTranslation.createMany.mock.calls[0]?.[0].data).toHaveLength(2)
    expect(harness.tx.writingCategory.createMany).toHaveBeenCalledWith({
      data: [{ writingId: WRITING_ID, categoryId: CATEGORY_ID }],
    })
    expect(harness.tx.writingTag.createMany).toHaveBeenCalledWith({
      data: [{ writingId: WRITING_ID, tagId: TAG_ID }],
    })
    expect(harness.tx.writingMedia.createMany).toHaveBeenCalledWith({
      data: [{ writingId: WRITING_ID, mediaId: MEDIA_ID, sortOrder: 0 }],
    })
  })

  it('stores the Markdown body verbatim (no trim / escape)', async () => {
    await harness.service.create({
      slug: 'e2e-writing',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '中文标题', content: MARKDOWN }],
    })

    const rows = harness.tx.writingTranslation.createMany.mock.calls[0]?.[0].data as Array<{
      content: string
    }>

    expect(rows[0]?.content).toBe(MARKDOWN)
    expect(rows[0]?.content).toContain('# Heading')
    expect(rows[0]?.content).toContain('**bold**')
    expect(rows[0]?.content).toContain('- item one')
    expect(rows[0]?.content).toContain('```js')
  })

  it('writes excerpt (not summary) into writing_translations', async () => {
    await harness.service.create({
      slug: 'e2e-writing',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '中文标题', excerpt: '第一段摘要' }],
    })

    const rows = harness.tx.writingTranslation.createMany.mock.calls[0]?.[0].data as Array<
      Record<string, unknown>
    >

    expect(rows[0]).toMatchObject({ excerpt: '第一段摘要' })
    expect(rows[0]).not.toHaveProperty('summary')
  })

  it('sets publishedAt automatically when creating a PUBLISHED writing', async () => {
    await harness.service.create({
      slug: 'e2e-writing',
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '中文标题' }],
    })

    const data = harness.tx.writing.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

    expect(data.publishedAt).toBeInstanceOf(Date)
  })

  it('never invents publishedAt for DRAFT or ARCHIVED', async () => {
    for (const status of ['DRAFT', 'ARCHIVED'] as const) {
      const scoped = createHarness()

      await scoped.service.create({
        slug: 'e2e-writing',
        status,
        translations: [{ locale: 'zh-CN', title: '中文标题' }],
      })

      const data = scoped.tx.writing.create.mock.calls[0]?.[0].data as { publishedAt: Date | null }

      expect(data.publishedAt).toBeNull()
    }
  })

  it('maps slug conflicts (P2002) and missing relations (P2003) to CONFLICT', async () => {
    const conflictHarness = createHarness()

    conflictHarness.tx.writing.create.mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    )

    await expect(
      conflictHarness.service.create({
        slug: 'taken',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '重复' }],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })

    const relationHarness = createHarness()

    relationHarness.tx.writingCategory.createMany.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    )

    await expect(
      relationHarness.service.create({
        slug: 'e2e-writing',
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '中文标题' }],
        categoryIds: [CATEGORY_ID],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('AdminWritingService.update', () => {
  it('upserts translations (excerpt + verbatim content) and replaces relations', async () => {
    const harness = createHarness()

    await harness.service.update(WRITING_ID, {
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'zh-CN', title: '更新后', excerpt: '新摘要', content: MARKDOWN }],
      categoryIds: [CATEGORY_ID],
      tagIds: [],
      mediaIds: [],
    })

    const updateData = harness.tx.writing.update.mock.calls[0]?.[0].data as {
      status: string
      featured: boolean
      publishedAt: Date
    }

    expect(updateData.status).toBe('PUBLISHED')
    expect(updateData.featured).toBe(true)
    expect(updateData.publishedAt).toBeInstanceOf(Date)

    const upsert = harness.tx.writingTranslation.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>
    }

    expect(upsert.update).toMatchObject({ excerpt: '新摘要', content: MARKDOWN })

    expect(harness.tx.writingCategory.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingCategory.createMany).toHaveBeenCalled()
    expect(harness.tx.writingTag.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingTag.createMany).not.toHaveBeenCalled()
    expect(harness.tx.writingMedia.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingMedia.createMany).not.toHaveBeenCalled()
  })

  it('keeps the existing publishedAt when unpublishing', async () => {
    const published = {
      ...baseWriting,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
    }
    const harness = createHarness({ writing: { findUnique: vi.fn().mockResolvedValue(published) } })

    await harness.service.update(WRITING_ID, { status: 'ARCHIVED' })

    const data = harness.tx.writing.update.mock.calls[0]?.[0].data as { publishedAt: Date }

    expect(data.publishedAt.toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })

  it('throws NOT_FOUND for unknown ids and maps slug conflicts to CONFLICT', async () => {
    const missing = createHarness({ writing: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(missing.service.update(WRITING_ID, { featured: true })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })

    const conflict = createHarness()

    conflict.tx.writing.update.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    await expect(conflict.service.update(WRITING_ID, { slug: 'taken' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})

describe('AdminWritingService.remove', () => {
  it('cleans translations and join records, then deletes the writing only', async () => {
    const harness = createHarness()

    const result = await harness.service.remove(WRITING_ID)

    expect(result).toEqual({ id: WRITING_ID, deleted: true })
    expect(harness.tx.writingTranslation.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingCategory.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingTag.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writingMedia.deleteMany).toHaveBeenCalledWith({ where: { writingId: WRITING_ID } })
    expect(harness.tx.writing.delete).toHaveBeenCalledWith({ where: { id: WRITING_ID } })
    expect(Object.keys(harness.tx)).not.toContain('category')
    expect(Object.keys(harness.tx)).not.toContain('tag')
    expect(Object.keys(harness.tx)).not.toContain('media')
  })

  it('throws NOT_FOUND when removing an unknown writing', async () => {
    const harness = createHarness({ writing: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.remove(WRITING_ID)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('AdminWritingService detail mapping', () => {
  it('exposes excerpt + verbatim content and omits work/lab-only fields', async () => {
    const harness = createHarness()

    const detail = (await harness.service.findById(WRITING_ID)) as Record<string, unknown>
    const translations = detail.translations as Array<Record<string, unknown>>

    expect(detail.slug).toBe('e2e-writing')
    expect(detail).not.toHaveProperty('githubUrl')
    expect(detail).not.toHaveProperty('startDate')
    expect(translations[0]).toMatchObject({ locale: 'zh-CN', excerpt: '摘要', content: MARKDOWN })
    expect(translations[0]).not.toHaveProperty('summary')
  })
})

describe('AdminWritingService.list', () => {
  it('applies filters, pagination and default sort', async () => {
    const harness = createHarness()

    const result = await harness.service.list(
      makeQuery({ page: 2, pageSize: 5, status: 'PUBLISHED', featured: 'true', search: 'agent' }),
    )

    const args = harness.prisma.writing.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>
      orderBy: unknown
      skip: number
      take: number
    }

    expect(args.where.status).toBe('PUBLISHED')
    expect(args.where.featured).toBe(true)
    expect(args.where.OR).toBeDefined()
    expect(args.orderBy).toEqual([{ updatedAt: 'desc' }])
    expect(args.skip).toBe(5)
    expect(args.take).toBe(5)
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 1, totalPages: 1 })
  })

  it('filters by category/tag slug and reports totalPages 0 for empty results', async () => {
    const harness = createHarness()

    await harness.service.list(makeQuery({ category: 'engineering', tag: 'typescript' }))

    const args = harness.prisma.writing.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }

    expect(args.where.categories).toEqual({ some: { category: { slug: 'engineering' } } })
    expect(args.where.tags).toEqual({ some: { tag: { slug: 'typescript' } } })

    harness.prisma.writing.findMany.mockResolvedValue([])
    harness.prisma.writing.count.mockResolvedValue(0)

    const result = await harness.service.list(makeQuery())

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 })
  })
})
