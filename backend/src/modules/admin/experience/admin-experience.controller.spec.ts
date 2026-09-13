import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminExperienceController } from './admin-experience.controller.js'
import type { AdminExperienceService } from './admin-experience.service.js'

const EXPERIENCE_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const service = {
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
    create: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
    update: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID }),
    remove: vi.fn().mockResolvedValue({ id: EXPERIENCE_ID, deleted: true }),
  }

  return {
    service,
    controller: new AdminExperienceController(service as unknown as AdminExperienceService),
  }
}

describe('AdminExperienceController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminExperienceController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('delegates every handler to AdminExperienceService without extra logic', async () => {
    const { controller, service } = createController()

    await controller.list({ page: 1, pageSize: 12 } as never)
    await controller.detail(EXPERIENCE_ID)
    await controller.create({ translations: [] } as never)
    await controller.update(EXPERIENCE_ID, { sortOrder: 2 })
    await controller.remove(EXPERIENCE_ID)

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.findById).toHaveBeenCalledWith(EXPERIENCE_ID)
    expect(service.create).toHaveBeenCalledTimes(1)
    expect(service.update).toHaveBeenCalledWith(EXPERIENCE_ID, { sortOrder: 2 })
    expect(service.remove).toHaveBeenCalledWith(EXPERIENCE_ID)
  })
})
