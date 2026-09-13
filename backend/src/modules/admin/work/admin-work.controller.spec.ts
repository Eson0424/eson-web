import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminWorkController } from './admin-work.controller.js'
import type { AdminWorkService } from './admin-work.service.js'

const WORK_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const service = {
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn().mockResolvedValue({ id: WORK_ID }),
    create: vi.fn().mockResolvedValue({ id: WORK_ID }),
    update: vi.fn().mockResolvedValue({ id: WORK_ID }),
    remove: vi.fn().mockResolvedValue({ id: WORK_ID, deleted: true }),
  }

  return { service, controller: new AdminWorkController(service as unknown as AdminWorkService) }
}

describe('AdminWorkController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminWorkController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('delegates every handler to AdminWorkService without extra logic', async () => {
    const { controller, service } = createController()

    await controller.list({ page: 1, pageSize: 12 } as never)
    await controller.detail(WORK_ID)
    await controller.create({ slug: 'eson-web', status: 'DRAFT', translations: [] } as never)
    await controller.update(WORK_ID, { featured: true })
    await controller.remove(WORK_ID)

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.findById).toHaveBeenCalledWith(WORK_ID)
    expect(service.create).toHaveBeenCalledTimes(1)
    expect(service.update).toHaveBeenCalledWith(WORK_ID, { featured: true })
    expect(service.remove).toHaveBeenCalledWith(WORK_ID)
  })
})
