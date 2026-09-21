import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminContactController } from './admin-contact.controller.js'
import type { AdminContactService } from './admin-contact.service.js'

const MESSAGE_ID = '11111111-1111-4111-8111-111111111111'

function createController() {
  const service = {
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn().mockResolvedValue({ id: MESSAGE_ID }),
    updateStatus: vi.fn().mockResolvedValue({ id: MESSAGE_ID, status: 'READ' }),
  }

  return { service, controller: new AdminContactController(service as unknown as AdminContactService) }
}

describe('AdminContactController', () => {
  it('is protected by JwtAuthGuard and AdminRoleGuard on the whole controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminContactController) as unknown[]

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard])
  })

  it('delegates every handler to AdminContactService without extra logic', async () => {
    const { controller, service } = createController()
    const query = { page: 1, pageSize: 12 } as never

    await controller.list(query)
    await controller.detail(MESSAGE_ID)
    await controller.update(MESSAGE_ID, { status: 'READ' })

    expect(service.list).toHaveBeenCalledWith(query)
    expect(service.findById).toHaveBeenCalledWith(MESSAGE_ID)
    expect(service.updateStatus).toHaveBeenCalledWith(MESSAGE_ID, 'READ')
  })
})
