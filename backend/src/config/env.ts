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

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3001),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-jwt-secret',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret',
    accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TTL ?? 900),
    refreshTokenTtlSeconds: Number(process.env.JWT_REFRESH_TTL ?? 604800),
    contactIpSalt: process.env.CONTACT_IP_SALT ?? 'dev-only-ip-salt',
    storage: {
      driver: process.env.STORAGE_DRIVER?.trim() || 'local',
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
