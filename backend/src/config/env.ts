/**
 * 生产环境必须显式提供、且不得使用下列已知开发占位值的 secret（Phase 5-C）。
 * 键名用于错误信息；值仅用于识别「误把开发占位值用于生产」的情况。
 */
export const PRODUCTION_REQUIRED_SECRETS = {
  JWT_SECRET: 'dev-only-jwt-secret',
  JWT_REFRESH_SECRET: 'dev-only-refresh-secret',
  CONTACT_IP_SALT: 'dev-only-ip-salt',
} as const

export type ProductionSecretKey = keyof typeof PRODUCTION_REQUIRED_SECRETS

/**
 * 生产配置校验失败。
 *
 * 只包含缺失/无效的配置键名 —— 绝不包含任何 secret 值（AGENTS §60 日志与错误不得泄露凭据）。
 */
export class EnvValidationError extends Error {
  constructor(
    readonly invalidKeys: readonly string[],
    reason = 'must be set to a non-empty value; dev-only placeholders are not allowed when NODE_ENV=production',
  ) {
    super(`Invalid production configuration: ${invalidKeys.join(', ')} ${reason}`)
    this.name = 'EnvValidationError'
  }
}

/**
 * 生产媒体存储必须显式配置（Phase 5-E）。
 *
 * 两个变量都有「静默错误」的 fallback，生产环境必须拒绝启动：
 * - `MEDIA_PUBLIC_BASE_URL` 缺失会退化成 `http://localhost:<API_PORT>` → 公网无法访问媒体
 * - `MEDIA_LOCAL_ROOT` 缺失会退化成 `<backend cwd>/.data` → 媒体写进容器可写层，
 *   容器重建即丢失（media-data volume 完全失效）
 *
 * 只在 `NODE_ENV=production` 生效；开发 / 测试保留原有 fallback。
 */
export const PRODUCTION_REQUIRED_MEDIA_KEYS = ['MEDIA_PUBLIC_BASE_URL'] as const
export const PRODUCTION_REQUIRED_LOCAL_MEDIA_KEYS = ['MEDIA_LOCAL_ROOT'] as const

const MEDIA_REASON =
  'must be set explicitly when NODE_ENV=production (no localhost / container-filesystem fallback)'

/**
 * 读取 secret：
 * - production：必须提供非空值，且不得等于已知 dev 占位值；否则记入 invalidKeys（最终由 readEnv 抛出）
 * - development / test：保留开发友好的 fallback（仅本地与测试使用，绝不用于生产）
 */
function readSecret(
  key: ProductionSecretKey,
  raw: string | undefined,
  isProduction: boolean,
  invalidKeys: ProductionSecretKey[],
): string {
  const value = raw?.trim()

  if (!isProduction) {
    return value && value.length > 0 ? value : PRODUCTION_REQUIRED_SECRETS[key]
  }

  if (!value || value === PRODUCTION_REQUIRED_SECRETS[key]) {
    invalidKeys.push(key)

    return ''
  }

  return value
}

/** 集中读取环境变量，避免业务代码直接散落 process.env（AGENTS §39） */
export interface AppEnv {
  nodeEnv: string
  isProduction: boolean
  port: number
  corsOrigin: string[]
  databaseUrl: string
  jwtSecret: string
  jwtRefreshSecret: string
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
  contactIpSalt: string
  storage: {
    /** local（默认，本地文件系统）| s3（S3-compatible，驱动在后续阶段实现） */
    driver: string
    endpoint: string | undefined
    region: string | undefined
    bucket: string | undefined
    accessKey: string | undefined
    secretKey: string | undefined
    /** 可选：本地媒体根目录（默认 <backend cwd>/.data/media） */
    localRoot: string | undefined
    /** 可选：公开访问前缀（默认 http://localhost:<port>） */
    publicBaseUrl: string | undefined
  }
}

export function readEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const isProduction = nodeEnv === 'production'
  const invalidSecrets: ProductionSecretKey[] = []
  const storageDriver = process.env.STORAGE_DRIVER?.trim().toLowerCase() || 'local'

  const jwtSecret = readSecret('JWT_SECRET', process.env.JWT_SECRET, isProduction, invalidSecrets)
  const jwtRefreshSecret = readSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
    isProduction,
    invalidSecrets,
  )
  const contactIpSalt = readSecret(
    'CONTACT_IP_SALT',
    process.env.CONTACT_IP_SALT,
    isProduction,
    invalidSecrets,
  )

  // fail-fast：生产环境缺失/无效 secret 时拒绝启动（不静默使用 dev 占位值）
  if (invalidSecrets.length > 0) {
    throw new EnvValidationError(invalidSecrets)
  }

  // fail-fast：生产环境媒体存储必须显式配置，不允许 localhost / 容器内 .data 静默回退（Phase 5-E）
  if (isProduction) {
    const invalidMediaKeys: string[] = []

    if (!process.env.MEDIA_PUBLIC_BASE_URL?.trim()) {
      invalidMediaKeys.push(...PRODUCTION_REQUIRED_MEDIA_KEYS)
    }

    if (storageDriver === 'local' && !process.env.MEDIA_LOCAL_ROOT?.trim()) {
      invalidMediaKeys.push(...PRODUCTION_REQUIRED_LOCAL_MEDIA_KEYS)
    }

    if (invalidMediaKeys.length > 0) {
      throw new EnvValidationError(invalidMediaKeys, MEDIA_REASON)
    }
  }

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3001),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwtSecret,
    jwtRefreshSecret,
    accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TTL ?? 900),
    refreshTokenTtlSeconds: Number(process.env.JWT_REFRESH_TTL ?? 604800),
    contactIpSalt,
    storage: {
      driver: storageDriver,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      localRoot: process.env.MEDIA_LOCAL_ROOT,
      publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL,
    },
  }
}
