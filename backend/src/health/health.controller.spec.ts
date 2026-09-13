import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { PrismaService } from '../prisma/prisma.service.js'
import { HealthController } from './health.controller.js'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { checkConnection: async () => ({ ok: true }) },
        },
      ],
    }).compile()

    controller = moduleRef.get(HealthController)
  })

  it('reports process and database status', async () => {
    const response = { status: () => undefined } as never
    const result = await controller.check(response)

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('ok')
    expect(result.data.process).toBe('up')
    expect(result.data.database).toBe('up')
    expect(result.meta).toBeNull()
  })
})
