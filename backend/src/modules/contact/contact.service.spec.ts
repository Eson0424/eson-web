import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ContactService } from './contact.service.js'

describe('ContactService', () => {
  let create: ReturnType<typeof vi.fn>
  let service: ContactService

  beforeEach(() => {
    create = vi.fn().mockResolvedValue({
      id: 'message-1',
      status: 'UNREAD',
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
    })

    service = new ContactService({ contactMessage: { create } } as unknown as PrismaService)
  })

  it('stores only a hashed IP, never the raw address', async () => {
    await service.create(
      {
        name: 'Demo',
        email: 'Demo@Example.com',
        subject: 'Hello',
        message: 'A message long enough for validation.',
      },
      '203.0.113.10',
      'vitest',
    )

    const payload = create.mock.calls[0]?.[0]?.data as Record<string, unknown>

    expect(payload.ipHash).toBeTypeOf('string')
    expect(payload.ipHash).not.toBe('203.0.113.10')
    expect(JSON.stringify(payload)).not.toContain('203.0.113.10')
    expect(payload.email).toBe('demo@example.com')
  })

  it('returns a minimal receipt instead of the stored row', async () => {
    const result = await service.create(
      { name: 'Demo', email: 'demo@example.com', subject: 'Hello', message: 'Message body.' },
      undefined,
      undefined,
    )

    expect(result).toEqual({
      id: 'message-1',
      status: 'UNREAD',
      createdAt: '2026-09-13T00:00:00.000Z',
    })
  })
})
