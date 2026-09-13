import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../../../prisma/prisma.service.js'
import { AdminExperienceService } from './admin-experience.service.js'
import { AdminExperienceQueryDto } from './dto/admin-experience-query.dto.js'

const EXPERIENCE_ID = '11111111-1111-4111-8111-111111111111'

function makeQuery(overrides: Partial<AdminExperienceQueryDto> = {}): AdminExperienceQueryDto {
  return Object.assign(new AdminExperienceQueryDto(), overrides)
}

const baseExperience = {
  id: EXPERIENCE_ID,
  company: null,
  role: null,
  employmentType: 'FULL_TIME',
  location: 'Shanghai',
  startDate: new Date('2024-01-01T00:00:00.000Z'),
  endDate: null,
  isCurrent: true,
  sortOrder: 1,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  translations: [
    {
      locale: 'zh-CN',
      roleName: '软件工程师',
      companyName: '示例公司',
      summary: '摘要',
      content: '正文',
    },
  ],
}

function createHarness(overrides: Record<string, unknown> = {}) {
  const tx = {
    experience: {
      create: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
      update: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
      delete: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(baseExperience),
    },
    experienceTranslation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    experience: {
      findMany: vi.fn().mockResolvedValue([baseExperience]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(baseExperience),
      ...(overrides.experience as object),
    },
  }

  return { prisma, tx, service: new AdminExperienceService(prisma as unknown as PrismaService) }
}

describe('AdminExperienceService.create', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('creates experience and translations inside one transaction', async () => {
    await harness.service.create({
      sortOrder: 2,
      employmentType: 'FULL_TIME',
      location: 'Shanghai',
      startDate: '2024-01-01',
      isCurrent: true,
      translations: [
        { locale: 'zh-CN', roleName: '软件工程师', companyName: '示例公司', summary: '摘要', content: '正文' },
        { locale: 'en-US', roleName: 'Software Engineer' },
      ],
    })

    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(harness.tx.experience.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sortOrder: 2,
          employmentType: 'FULL_TIME',
          location: 'Shanghai',
          isCurrent: true,
          endDate: null,
        }),
      }),
    )

    const rows = harness.tx.experienceTranslation.createMany.mock.calls[0]?.[0].data as Array<
      Record<string, unknown>
    >

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      experienceId: EXPERIENCE_ID,
      locale: 'zh-CN',
      roleName: '软件工程师',
      companyName: '示例公司',
      summary: '摘要',
      content: '正文',
    })
  })

  it('defaults sortOrder to 0 and isCurrent to false', async () => {
    await harness.service.create({
      translations: [{ locale: 'zh-CN', roleName: '工程师' }],
    })

    const data = harness.tx.experience.create.mock.calls[0]?.[0].data as Record<string, unknown>

    expect(data.sortOrder).toBe(0)
    expect(data.isCurrent).toBe(false)
    expect(data.endDate).toBeNull()
  })

  it('never writes the top-level company / role columns', async () => {
    await harness.service.create({
      translations: [{ locale: 'zh-CN', roleName: '工程师', companyName: '示例公司' }],
    })

    const data = harness.tx.experience.create.mock.calls[0]?.[0].data as Record<string, unknown>

    expect(data).not.toHaveProperty('company')
    expect(data).not.toHaveProperty('role')
  })

  it('rejects isCurrent combined with endDate', async () => {
    await expect(
      harness.service.create({
        isCurrent: true,
        endDate: '2025-01-01',
        translations: [{ locale: 'zh-CN', roleName: '工程师' }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })

    expect(harness.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a reversed date range', async () => {
    await expect(
      harness.service.create({
        startDate: '2025-01-01',
        endDate: '2024-01-01',
        translations: [{ locale: 'zh-CN', roleName: '工程师' }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('rejects duplicate translation locales with 400 instead of a DB conflict', async () => {
    await expect(
      harness.service.create({
        translations: [
          { locale: 'zh-CN', roleName: '工程师' },
          { locale: 'zh-CN', roleName: '工程师（重复）' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })
})

describe('AdminExperienceService.update', () => {
  it('merges fields, upserts translations and stays atomic', async () => {
    const harness = createHarness()

    await harness.service.update(EXPERIENCE_ID, {
      sortOrder: 5,
      employmentType: 'CONTRACT',
      translations: [{ locale: 'en-US', roleName: 'Software Engineer' }],
    })

    const data = harness.tx.experience.update.mock.calls[0]?.[0].data as Record<string, unknown>

    expect(data).toMatchObject({ sortOrder: 5, employmentType: 'CONTRACT' })
    expect(data).not.toHaveProperty('location')
    expect(harness.tx.experienceTranslation.upsert).toHaveBeenCalledTimes(1)
    expect(harness.tx.experienceTranslation.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { experienceId_locale: { experienceId: EXPERIENCE_ID, locale: 'en-US' } },
    })
    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('rejects setting an endDate on an isCurrent entry (merged values)', async () => {
    const harness = createHarness()

    await expect(
      harness.service.update(EXPERIENCE_ID, { endDate: '2025-01-01' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

    expect(harness.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('allows clearing endDate while becoming current', async () => {
    const harness = createHarness({
      experience: {
        findUnique: vi.fn().mockResolvedValue({
          ...baseExperience,
          isCurrent: false,
          endDate: new Date('2025-01-01T00:00:00.000Z'),
        }),
      },
    })

    await harness.service.update(EXPERIENCE_ID, { isCurrent: true, endDate: null })

    const data = harness.tx.experience.update.mock.calls[0]?.[0].data as Record<string, unknown>

    expect(data).toMatchObject({ isCurrent: true, endDate: null })
  })

  it('throws NOT_FOUND for unknown ids', async () => {
    const harness = createHarness({ experience: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.update(EXPERIENCE_ID, { sortOrder: 1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })
})

describe('AdminExperienceService.remove', () => {
  it('deletes translations and the experience inside one transaction', async () => {
    const harness = createHarness()

    await expect(harness.service.remove(EXPERIENCE_ID)).resolves.toEqual({
      id: EXPERIENCE_ID,
      deleted: true,
    })

    expect(harness.tx.experienceTranslation.deleteMany).toHaveBeenCalledWith({
      where: { experienceId: EXPERIENCE_ID },
    })
    expect(harness.tx.experience.delete).toHaveBeenCalledWith({ where: { id: EXPERIENCE_ID } })
    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('throws NOT_FOUND when removing an unknown experience', async () => {
    const harness = createHarness({ experience: { findUnique: vi.fn().mockResolvedValue(null) } })

    await expect(harness.service.remove(EXPERIENCE_ID)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('AdminExperienceService mapping', () => {
  it('exposes locale-picked role/company plus translation status', async () => {
    const harness = createHarness()

    const result = await harness.service.list(makeQuery({ locale: 'zh-CN' }))
    const item = result.data[0] as Record<string, unknown>

    expect(item).toMatchObject({
      id: EXPERIENCE_ID,
      role: '软件工程师',
      company: '示例公司',
      employmentType: 'FULL_TIME',
      isCurrent: true,
      sortOrder: 1,
      locale: 'zh-CN',
      localeFallback: false,
    })
    expect(item.translationStatus).toEqual({ 'zh-CN': true, 'en-US': false })
    expect(item.missingLocales).toEqual(['en-US'])
  })

  it('returns every translation in the detail payload', async () => {
    const harness = createHarness()

    const detail = (await harness.service.findById(EXPERIENCE_ID)) as Record<string, unknown>

    expect(detail).toMatchObject({ id: EXPERIENCE_ID, isCurrent: true, startDate: '2024-01-01' })
    expect(detail.translations).toEqual([
      {
        locale: 'zh-CN',
        roleName: '软件工程师',
        companyName: '示例公司',
        summary: '摘要',
        content: '正文',
      },
    ])
    expect(detail).not.toHaveProperty('company')
  })
})

describe('AdminExperienceService.list', () => {
  it('applies search, default ordering and pagination', async () => {
    const harness = createHarness()

    const result = await harness.service.list(makeQuery({ page: 2, pageSize: 5, search: 'engineer' }))
    const args = harness.prisma.experience.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>
      orderBy: unknown
      skip: number
      take: number
    }

    expect(args.where.OR).toBeDefined()
    expect(args.orderBy).toEqual([
      { sortOrder: 'asc' },
      { startDate: 'desc' },
      { createdAt: 'desc' },
    ])
    expect(args.skip).toBe(5)
    expect(args.take).toBe(5)
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 1, totalPages: 1 })
  })

  it('honours the Experience sort whitelist', async () => {
    const harness = createHarness()

    await harness.service.list(makeQuery({ sort: 'startDate', order: 'desc' }))

    expect(harness.prisma.experience.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { startDate: 'desc' },
      { createdAt: 'desc' },
    ])
  })

  it('reports totalPages 0 for an empty result set', async () => {
    const harness = createHarness()

    harness.prisma.experience.findMany.mockResolvedValue([])
    harness.prisma.experience.count.mockResolvedValue(0)

    const result = await harness.service.list(makeQuery())

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 })
  })
})
