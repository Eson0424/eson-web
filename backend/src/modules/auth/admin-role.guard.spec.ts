import { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../common/errors/app-error.js'
import { AdminRoleGuard } from './jwt-auth.guard.js'

function createContext(role?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'u1', role } : undefined }),
    }),
  } as unknown as ExecutionContext
}

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard()

  it('allows ADMIN', () => {
    expect(guard.canActivate(createContext('ADMIN'))).toBe(true)
  })

  it('rejects non-admin roles with FORBIDDEN', () => {
    // guard 抛出统一错误对象（AppError），由全局 filter 转成 403 + FORBIDDEN envelope
    expect(() => guard.canActivate(createContext('AUTHOR'))).toThrow(AppError)
    expect(() => guard.canActivate(createContext('AUTHOR'))).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403 }),
    )
  })

  it('rejects unauthenticated requests', () => {
    expect(() => guard.canActivate(createContext())).toThrow(AppError)
  })
})
