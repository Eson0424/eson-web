import argon2 from 'argon2'
import { describe, expect, it, vi } from 'vitest'
import {
  AdminBootstrapError,
  DEV_ONLY_ADMIN_EMAIL,
  DEV_ONLY_ADMIN_PASSWORD,
  bootstrapAdmin,
  describeDatabaseTarget,
  validateAdminBootstrapEnv,
  type AdminBootstrapWriter,
} from './admin-bootstrap.js'

// Phase 5-D：生产 Admin Bootstrap 的纯逻辑（无数据库、无 HTTP）。

const VALID_EMAIL = 'owner@eson.dev'
const VALID_PASSWORD = 'a-strong-production-password'

function input(overrides: Record<string, string | undefined> = {}) {
  return { ADMIN_EMAIL: VALID_EMAIL, ADMIN_PASSWORD: VALID_PASSWORD, ...overrides }
}

describe('validateAdminBootstrapEnv', () => {
  it('rejects a missing or blank ADMIN_EMAIL', () => {
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_EMAIL: undefined }))).toThrowError(
      expect.objectContaining({ code: 'MISSING_EMAIL' }),
    )
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_EMAIL: '   ' }))).toThrowError(
      expect.objectContaining({ code: 'MISSING_EMAIL' }),
    )
  })

  it('rejects an invalid email format', () => {
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_EMAIL: 'not-an-email' }))).toThrowError(
      expect.objectContaining({ code: 'INVALID_EMAIL' }),
    )
  })

  it('refuses the development default admin email', () => {
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_EMAIL: DEV_ONLY_ADMIN_EMAIL }))).toThrowError(
      expect.objectContaining({ code: 'DEV_DEFAULT_NOT_ALLOWED' }),
    )
  })

  it('rejects a missing ADMIN_PASSWORD and the development default password', () => {
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_PASSWORD: undefined }))).toThrowError(
      expect.objectContaining({ code: 'MISSING_PASSWORD' }),
    )
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_PASSWORD: DEV_ONLY_ADMIN_PASSWORD }))).toThrowError(
      expect.objectContaining({ code: 'DEV_DEFAULT_NOT_ALLOWED' }),
    )
  })

  it('enforces the minimum password length (whitespace does not count)', () => {
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_PASSWORD: 'short-pass1' }))).toThrowError(
      expect.objectContaining({ code: 'WEAK_PASSWORD' }),
    )
    expect(() => validateAdminBootstrapEnv(input({ ADMIN_PASSWORD: '            ' }))).toThrowError(
      expect.objectContaining({ code: 'WEAK_PASSWORD' }),
    )
  })

  it('normalises a valid email to lowercase and trims input', () => {
    const parsed = validateAdminBootstrapEnv(input({ ADMIN_EMAIL: '  Owner@Eson.DEV  ' }))

    expect(parsed.email).toBe('owner@eson.dev')
    expect(parsed.password).toBe(VALID_PASSWORD)
    expect(parsed.name).toBe('Admin')
  })

  it('uses ADMIN_NAME when provided', () => {
    expect(validateAdminBootstrapEnv(input({ ADMIN_NAME: '  ESON Owner  ' })).name).toBe('ESON Owner')
  })

  it('never includes the password value in error messages', () => {
    const secret = 'dev-only-password' // 触发 DEV_DEFAULT_NOT_ALLOWED

    try {
      validateAdminBootstrapEnv(input({ ADMIN_PASSWORD: secret }))
      throw new Error('expected validation to fail')
    } catch (error) {
      expect((error as Error).message).not.toContain(secret)
    }
  })
})

describe('bootstrapAdmin', () => {
  it('stores an argon2 hash instead of the plaintext password', async () => {
    const createAdmin = vi.fn(async (data: { email: string; passwordHash: string; name: string }) => ({
      id: 'user-1',
      email: data.email,
    }))
    const writer: AdminBootstrapWriter = { createAdmin }

    const created = await bootstrapAdmin(validateAdminBootstrapEnv(input()), writer)

    const stored = createAdmin.mock.calls[0]![0]

    expect(created).toEqual({ id: 'user-1', email: VALID_EMAIL })
    expect(stored.passwordHash).not.toBe(VALID_PASSWORD)
    expect(stored.passwordHash.startsWith('$argon2')).toBe(true)
    expect(await argon2.verify(stored.passwordHash, VALID_PASSWORD)).toBe(true)
    expect(stored.name).toBe('Admin')
  })

  it('fails safely when the email already exists (no duplicate account, no partial state)', async () => {
    const conflict = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    const writer: AdminBootstrapWriter = { createAdmin: vi.fn().mockRejectedValue(conflict) }

    await expect(bootstrapAdmin(validateAdminBootstrapEnv(input()), writer)).rejects.toMatchObject({
      code: 'ADMIN_ALREADY_EXISTS',
    })
  })

  it('reports a verification failure when the stored hash cannot be verified', async () => {
    const writer: AdminBootstrapWriter = {
      createAdmin: vi.fn().mockResolvedValue({ id: 'user-1', email: VALID_EMAIL }),
      verifyPassword: vi.fn().mockResolvedValue(false),
    }

    await expect(bootstrapAdmin(validateAdminBootstrapEnv(input()), writer)).rejects.toMatchObject({
      code: 'VERIFICATION_FAILED',
    })
  })

  it('verifies the created account through the writer when verification is available', async () => {
    const verifyPassword = vi.fn().mockResolvedValue(true)
    const writer: AdminBootstrapWriter = {
      createAdmin: vi.fn().mockResolvedValue({ id: 'user-1', email: VALID_EMAIL }),
      verifyPassword,
    }

    await bootstrapAdmin(validateAdminBootstrapEnv(input()), writer)

    expect(verifyPassword).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD)
  })

  it('propagates unexpected database errors untouched and keeps the password out of the message', async () => {
    const writer: AdminBootstrapWriter = {
      createAdmin: vi.fn().mockRejectedValue(new Error('database is unreachable')),
    }

    try {
      await bootstrapAdmin(validateAdminBootstrapEnv(input()), writer)
      throw new Error('expected bootstrap to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('database is unreachable')
      expect((error as Error).message).not.toContain(VALID_PASSWORD)
    }
  })
})

describe('describeDatabaseTarget', () => {
  it('prints host/port/database without credentials', () => {
    const described = describeDatabaseTarget(
      'postgresql://eson:super-secret@db.internal:5432/eson_web?schema=public',
    )

    expect(described).toBe('db.internal:5432/eson_web')
    expect(described).not.toContain('super-secret')
    expect(described).not.toContain('eson:')
  })

  it('handles unparsable values without leaking them', () => {
    expect(describeDatabaseTarget('not-a-url')).toBe('(unparsable DATABASE_URL)')
  })
})

describe('AdminBootstrapError', () => {
  it('exposes a stable code and a name for logging', () => {
    const error = new AdminBootstrapError('MISSING_PASSWORD', 'ADMIN_PASSWORD is required')

    expect(error.code).toBe('MISSING_PASSWORD')
    expect(error.name).toBe('AdminBootstrapError')
  })
})
