import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminWritingController } from './admin-writing.controller.js'
import type { AdminWritingService } from './admin-writing.service.js'

const WRITING_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const service = {
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn().mockResolvedValue({ id: WRITING_ID }),
    create: vi.fn().mockResolvedValue({ id: WRITING_ID }),
    update: vi.fn().mockResolvedValue({ id: WRITING_ID }),
    remove: vi.fn().mockResolvedValue({ id: WRITING_ID, deleted: true }),
  }

  return { service, controller: new AdminWritingController(service as unknown as AdminWritingService) }
}

describe('AdminWritingController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminWritingController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('delegates every handler to AdminWritingService without extra logic', async () => {
    const { controller, service } = createController()

    await controller.list({ page: 1, pageSize: 12 } as never)
    await controller.detail(WRITING_ID)
    await controller.create({ slug: 'e2e-writing', status: 'DRAFT', translations: [] } as never)
    await controller.update(WRITING_ID, { featured: true })
    await controller.remove(WRITING_ID)

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.findById).toHaveBeenCalledWith(WRITING_ID)
    expect(service.create).toHaveBeenCalledTimes(1)
    expect(service.update).toHaveBeenCalledWith(WRITING_ID, { featured: true })
    expect(service.remove).toHaveBeenCalledWith(WRITING_ID)
  })
})
