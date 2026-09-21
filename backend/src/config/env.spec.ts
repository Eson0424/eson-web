import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EnvValidationError, PRODUCTION_REQUIRED_SECRETS, readEnv } from './env.js'

// Phase 5-C：生产环境 secret fail-fast（缺失 / 空白 / dev 占位值 → 拒绝启动）。
// 只验证配置读取逻辑，不涉及 Auth / DB / HTTP 行为。

const ENV_KEYS = [
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CONTACT_IP_SALT',
  // Phase 5-E：生产媒体存储必填项
  'STORAGE_DRIVER',
  'MEDIA_PUBLIC_BASE_URL',
  'MEDIA_LOCAL_ROOT',
  // Phase 5-I：CORS origin 规范化
  'CORS_ORIGIN',
] as const

const saved: Record<string, string | undefined> = {}

function clearSecretKeys() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

/** 有效的生产 secret 组合（媒体配置单独设置） */
function setValidProductionSecrets() {
  process.env.NODE_ENV = 'production'
  process.env.JWT_SECRET = 'a'.repeat(48)
  process.env.JWT_REFRESH_SECRET = 'b'.repeat(48)
  process.env.CONTACT_IP_SALT = 'c'.repeat(32)
}

/** 有效的生产媒体配置（Phase 5-E） */
function setValidProductionMediaEnv() {
  process.env.MEDIA_PUBLIC_BASE_URL = 'https://eson.example.test'
  process.env.MEDIA_LOCAL_ROOT = '/srv/eson-media'
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
  }

  clearSecretKeys()
})

afterEach(() => {
  clearSecretKeys()

  for (const key of ENV_KEYS) {
    if (saved[key] !== undefined) {
      process.env[key] = saved[key]
    }
  }
})

describe('readEnv — production secret fail-fast', () => {
  it('starts with all three secrets provided', () => {
    setValidProductionSecrets()
    setValidProductionMediaEnv()

    const env = readEnv()

    expect(env.isProduction).toBe(true)
    expect(env.jwtSecret).toBe('a'.repeat(48))
    expect(env.jwtRefreshSecret).toBe('b'.repeat(48))
    expect(env.contactIpSalt).toBe('c'.repeat(32))
  })

  it('trims surrounding whitespace from valid secrets', () => {
    setValidProductionSecrets()
    setValidProductionMediaEnv()
    process.env.JWT_SECRET = '  secret-value-48-characters-long-padding-000  '
    process.env.JWT_REFRESH_SECRET = 'refresh-value-48-characters-long-padding-00'
    process.env.CONTACT_IP_SALT = 'salt-value'

    const env = readEnv()

    expect(env.jwtSecret).toBe('secret-value-48-characters-long-padding-000')
    expect(env.jwtSecret).not.toMatch(/\s/)
  })

  it('fails fast when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48)
    process.env.CONTACT_IP_SALT = 'c'.repeat(32)

    expect(() => readEnv()).toThrowError(EnvValidationError)
    expect(() => readEnv()).toThrowError(/JWT_SECRET/)
  })

  it('fails fast when JWT_REFRESH_SECRET is missing', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'a'.repeat(48)
    process.env.CONTACT_IP_SALT = 'c'.repeat(32)

    expect(() => readEnv()).toThrowError(/JWT_REFRESH_SECRET/)
  })

  it('fails fast when CONTACT_IP_SALT is missing', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'a'.repeat(48)
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48)

    expect(() => readEnv()).toThrowError(/CONTACT_IP_SALT/)
  })

  it('lists every invalid key in one error', () => {
    process.env.NODE_ENV = 'production'

    let error: unknown

    try {
      readEnv()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(EnvValidationError)
    expect((error as EnvValidationError).invalidKeys).toEqual([
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'CONTACT_IP_SALT',
    ])
  })

  it('rejects whitespace-only values', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = '   '
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48)
    process.env.CONTACT_IP_SALT = 'c'.repeat(32)

    expect(() => readEnv()).toThrowError(/JWT_SECRET/)
  })

  it('rejects the known dev-only placeholder values in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = PRODUCTION_REQUIRED_SECRETS.JWT_SECRET
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48)
    process.env.CONTACT_IP_SALT = 'c'.repeat(32)

    expect(() => readEnv()).toThrowError(/JWT_SECRET/)

    process.env.JWT_SECRET = 'a'.repeat(48)
    process.env.JWT_REFRESH_SECRET = PRODUCTION_REQUIRED_SECRETS.JWT_REFRESH_SECRET

    expect(() => readEnv()).toThrowError(/JWT_REFRESH_SECRET/)
  })

  it('never leaks the secret value in the error message', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'super-secret-value-that-must-not-appear-in-errors'
    // 故意只缺 JWT_REFRESH_SECRET / CONTACT_IP_SALT

    let message = ''

    try {
      readEnv()
    } catch (caught) {
      message = (caught as Error).message
    }

    expect(message).toContain('JWT_REFRESH_SECRET')
    expect(message).not.toContain('super-secret-value-that-must-not-appear-in-errors')
  })
})

describe('readEnv — development / test behaviour preserved', () => {
  it('keeps the developer-friendly fallbacks in development', () => {
    process.env.NODE_ENV = 'development'

    const env = readEnv()

    expect(env.isProduction).toBe(false)
    expect(env.jwtSecret).toBe(PRODUCTION_REQUIRED_SECRETS.JWT_SECRET)
    expect(env.jwtRefreshSecret).toBe(PRODUCTION_REQUIRED_SECRETS.JWT_REFRESH_SECRET)
    expect(env.contactIpSalt).toBe(PRODUCTION_REQUIRED_SECRETS.CONTACT_IP_SALT)
  })

  it('keeps the fallbacks in test and when NODE_ENV is unset', () => {
    process.env.NODE_ENV = 'test'
    expect(readEnv().jwtSecret).toBe(PRODUCTION_REQUIRED_SECRETS.JWT_SECRET)

    delete process.env.NODE_ENV
    const env = readEnv()

    expect(env.nodeEnv).toBe('development')
    expect(env.jwtSecret).toBe(PRODUCTION_REQUIRED_SECRETS.JWT_SECRET)
  })

  it('uses explicitly provided values outside production (no override)', () => {
    process.env.NODE_ENV = 'development'
    process.env.JWT_SECRET = 'local-dev-secret'

    expect(readEnv().jwtSecret).toBe('local-dev-secret')
  })

  it('keeps the media fallbacks outside production', () => {
    process.env.NODE_ENV = 'development'

    const env = readEnv()

    expect(env.storage.driver).toBe('local')
    expect(env.storage.publicBaseUrl).toBeUndefined()
    expect(env.storage.localRoot).toBeUndefined()
  })
})

/**
 * Phase 5-I：CORS origin 解析。
 * 只规范化输入（trim / 去空项）并禁止生产通配符，不改动其余 CORS 语义。
 */
describe('readEnv — CORS origin', () => {
  it('trims every entry so "https://a, https://b" stays usable', () => {
    process.env.NODE_ENV = 'production'
    setValidProductionSecrets()
    setValidProductionMediaEnv()
    process.env.CORS_ORIGIN = 'https://esonji.cn, https://www.esonji.cn ,'

    expect(readEnv().corsOrigin).toEqual(['https://esonji.cn', 'https://www.esonji.cn'])
  })

  it('rejects the wildcard origin in production', () => {
    process.env.NODE_ENV = 'production'
    setValidProductionSecrets()
    setValidProductionMediaEnv()
    process.env.CORS_ORIGIN = '*'

    expect(() => readEnv()).toThrowError(EnvValidationError)
    expect(() => readEnv()).toThrowError(/CORS_ORIGIN/)
  })

  it('keeps at least one origin when the value is effectively empty', () => {
    process.env.NODE_ENV = 'development'
    process.env.CORS_ORIGIN = ' , '

    expect(readEnv().corsOrigin).toEqual(['http://localhost:3000'])
  })

  it('allows the wildcard outside production (unchanged dev behaviour)', () => {
    process.env.NODE_ENV = 'development'
    process.env.CORS_ORIGIN = '*'

    expect(readEnv().corsOrigin).toEqual(['*'])
  })
})

// Phase 5-E：生产媒体存储 fail-fast（缺失 MEDIA_PUBLIC_BASE_URL / MEDIA_LOCAL_ROOT → 拒绝启动）。
// 目的是禁止两个静默回退：http://localhost:<API_PORT> 与 <backend cwd>/.data。
describe('readEnv — production media storage fail-fast', () => {
  it('accepts an explicit production media configuration', () => {
    setValidProductionSecrets()
    setValidProductionMediaEnv()
    process.env.STORAGE_DRIVER = 'local'

    const env = readEnv()

    expect(env.storage.driver).toBe('local')
    expect(env.storage.publicBaseUrl).toBe('https://eson.example.test')
    expect(env.storage.localRoot).toBe('/srv/eson-media')
  })

  it('fails fast when MEDIA_PUBLIC_BASE_URL is missing', () => {
    setValidProductionSecrets()
    process.env.MEDIA_LOCAL_ROOT = '/srv/eson-media'

    expect(() => readEnv()).toThrowError(EnvValidationError)
    expect(() => readEnv()).toThrowError(/MEDIA_PUBLIC_BASE_URL/)
  })

  it('fails fast when MEDIA_PUBLIC_BASE_URL is whitespace only', () => {
    setValidProductionSecrets()
    process.env.MEDIA_PUBLIC_BASE_URL = '   '
    process.env.MEDIA_LOCAL_ROOT = '/srv/eson-media'

    expect(() => readEnv()).toThrowError(/MEDIA_PUBLIC_BASE_URL/)
  })

  it('fails fast when MEDIA_LOCAL_ROOT is missing for the local driver', () => {
    setValidProductionSecrets()
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://eson.example.test'
    process.env.STORAGE_DRIVER = 'local'

    expect(() => readEnv()).toThrowError(/MEDIA_LOCAL_ROOT/)
  })

  it('requires MEDIA_LOCAL_ROOT by default (implicit local driver)', () => {
    setValidProductionSecrets()
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://eson.example.test'

    expect(() => readEnv()).toThrowError(/MEDIA_LOCAL_ROOT/)
  })

  it('does not require MEDIA_LOCAL_ROOT for a non-local driver', () => {
    setValidProductionSecrets()
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://eson.example.test'
    process.env.STORAGE_DRIVER = 's3'

    const env = readEnv()

    expect(env.storage.driver).toBe('s3')
    expect(env.storage.localRoot).toBeUndefined()
  })

  it('lists every invalid media key in one error and never leaks a value', () => {
    setValidProductionSecrets()

    let error: unknown

    try {
      readEnv()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(EnvValidationError)
    expect((error as EnvValidationError).invalidKeys).toEqual([
      'MEDIA_PUBLIC_BASE_URL',
      'MEDIA_LOCAL_ROOT',
    ])
    expect((error as Error).message).not.toContain('/srv')
  })

  it('checks secrets before media configuration', () => {
    process.env.NODE_ENV = 'production'

    let error: unknown

    try {
      readEnv()
    } catch (caught) {
      error = caught
    }

    expect((error as EnvValidationError).invalidKeys).toEqual([
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'CONTACT_IP_SALT',
    ])
  })
})
