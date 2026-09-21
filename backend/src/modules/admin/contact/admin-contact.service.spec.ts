import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../../common/errors/app-error.js'
import type { PrismaService } from '../../../prisma/prisma.service.js'
import { AdminContactService } from './admin-contact.service.js'
import { AdminContactQueryDto } from './dto/admin-contact-query.dto.js'

const MESSAGE_ID = '11111111-1111-4111-8111-111111111111'

function makeQuery(overrides: Partial<AdminContactQueryDto> = {}): AdminContactQueryDto {
  return Object.assign(new AdminContactQueryDto(), overrides)
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID,
    name: 'Visitor',
    email: 'visitor@example.com',
    subject: 'Project enquiry',
    message: 'Message body.',
    status: 'UNREAD' as const,
    ipHash: 'seed-hash-unread',
    userAgent: 'vitest',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-02T00:00:00.000Z'),
    ...overrides,
  }
}

function createHarness(overrides: { findMany?: unknown; count?: number; findUnique?: unknown; update?: unknown } = {}) {
  const prisma = {
    contactMessage: {
      findMany: vi.fn().mockResolvedValue(overrides.findMany ?? [makeMessage()]),
      count: vi.fn().mockResolvedValue(overrides.count ?? 1),
      findUnique: vi.fn().mockResolvedValue(
        overrides.findUnique === undefined ? makeMessage() : overrides.findUnique,
      ),
      update: vi.fn().mockResolvedValue(overrides.update ?? makeMessage({ status: 'READ' })),
    },
  }

  return { prisma, service: new AdminContactService(prisma as unknown as PrismaService) }
}

describe('AdminContactService.list', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('sorts UNREAD first then newest by default and returns pagination meta', async () => {
    const result = await harness.service.list(makeQuery())

    expect(harness.prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 12,
      }),
    )
    expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 1, totalPages: 1 })
  })

  it('filters by status without losing the pagination window', async () => {
    await harness.service.list(makeQuery({ status: 'ARCHIVED', page: 2, pageSize: 5 }))

    expect(harness.prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ARCHIVED' }, skip: 5, take: 5 }),
    )
    expect(harness.prisma.contactMessage.count).toHaveBeenCalledWith({ where: { status: 'ARCHIVED' } })
  })

  it('honours an explicit sort/order pair instead of the default', async () => {
    await harness.service.list(makeQuery({ sort: 'updatedAt', order: 'asc' }))

    expect(harness.prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ updatedAt: 'asc' }] }),
    )
  })

  it('never exposes ipHash or userAgent to the admin client', async () => {
    const result = await harness.service.list(makeQuery())
    const [item] = result.data

    expect(Object.keys(item ?? {}).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'message',
      'name',
      'status',
      'subject',
      'updatedAt',
    ])
  })

  it('reports zero total pages when there are no messages', async () => {
    harness = createHarness({ findMany: [], count: 0 })

    const result = await harness.service.list(makeQuery())

    expect(result.data).toEqual([])
    expect(result.meta.totalPages).toBe(0)
  })
})

describe('AdminContactService.updateStatus', () => {
  let harness: ReturnType<typeof createHarness>

  beforeEach(() => {
    harness = createHarness()
  })

  it('updates only the status field and returns the mapped message', async () => {
    const result = await harness.service.updateStatus(MESSAGE_ID, 'READ')

    expect(harness.prisma.contactMessage.update).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID },
      data: { status: 'READ' },
    })
    expect(result.status).toBe('READ')
  })

  it('throws a 404 AppError for an unknown id instead of leaking a Prisma error', async () => {
    harness = createHarness({ findUnique: null })

    await expect(harness.service.updateStatus(MESSAGE_ID, 'ARCHIVED')).rejects.toBeInstanceOf(AppError)
    await expect(harness.service.updateStatus(MESSAGE_ID, 'ARCHIVED')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(harness.prisma.contactMessage.update).not.toHaveBeenCalled()
  })
})

describe('AdminContactService.findById', () => {
  it('throws 404 when the message does not exist', async () => {
    const harness = createHarness({ findUnique: null })

    await expect(harness.service.findById(MESSAGE_ID)).rejects.toMatchObject({ status: 404 })
  })
})
