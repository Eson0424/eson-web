import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminLabController } from './admin-lab.controller.js'
import type { AdminLabService } from './admin-lab.service.js'

const LAB_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const service = {
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn().mockResolvedValue({ id: LAB_ID }),
    create: vi.fn().mockResolvedValue({ id: LAB_ID }),
    update: vi.fn().mockResolvedValue({ id: LAB_ID }),
    remove: vi.fn().mockResolvedValue({ id: LAB_ID, deleted: true }),
  }

  return { service, controller: new AdminLabController(service as unknown as AdminLabService) }
}

describe('AdminLabController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminLabController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('delegates every handler to AdminLabService without extra logic', async () => {
    const { controller, service } = createController()

    await controller.list({ page: 1, pageSize: 12 } as never)
    await controller.detail(LAB_ID)
    await controller.create({ slug: 'e2e-lab', status: 'DRAFT', translations: [] } as never)
    await controller.update(LAB_ID, { featured: true })
    await controller.remove(LAB_ID)

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.findById).toHaveBeenCalledWith(LAB_ID)
    expect(service.create).toHaveBeenCalledTimes(1)
    expect(service.update).toHaveBeenCalledWith(LAB_ID, { featured: true })
    expect(service.remove).toHaveBeenCalledWith(LAB_ID)
  })
})
