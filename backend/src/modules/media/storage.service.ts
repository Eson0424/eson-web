import { Injectable } from '@nestjs/common'
import { ERROR_CODES, AppError } from '../../common/errors/app-error.js'
import { readEnv, type AppEnv } from '../../config/env.js'
import { LocalStorageDriver } from './drivers/local-storage.driver.js'
import { UnconfiguredStorageDriver } from './drivers/unconfigured-storage.driver.js'
import { assertSafeObjectKey, buildObjectKey, resolveLocalStorageRoot } from './object-key.js'
import type { PutObjectInput, StorageDriver, StorageDriverName, StoredObject } from './storage.types.js'

export interface StorageConfig {
  endpoint: string
  region: string
  bucket: string
  accessKey: string
  secretKey: string
}

/**
 * 对象存储门面（Phase 4-F.1）。
 *
 * Local : 本地文件系统（STORAGE_DRIVER=local，本地开发默认）；生产可指向 MinIO / S3-compatible
 * 本阶段只提供真实文件读写能力（put / delete / exists）、object key 与公开 URL 生成。
 * 上传接口（multipart）与 Media API 属于 Phase 4-F.2 / 4-F.3。
 */
@Injectable()
export class StorageService {
  private readonly env = readEnv()
  private readonly driver: StorageDriver = createStorageDriver(this.env)
  private readonly localRoot = resolveLocalStorageRoot(this.env.storage.localRoot)

  getDriverName(): StorageDriverName {
    return this.driver.name
  }

  /** 本地文件驱动（用于注册只读静态文件路由） */
  isLocal(): boolean {
    return this.driver.name === 'local'
  }

  getLocalRoot(): string | null {
    return this.isLocal() ? this.localRoot : null
  }

  /** 当前驱动是否可用于写入（不可用时由 driver 返回 503 fail-fast） */
  isConfigured(): boolean {
    return this.driver.isWritable()
  }

  unavailableReason(): string | undefined {
    return this.driver.unavailableReason?.()
  }

  /**
   * S3 兼容对象存储的连接配置（仅 S3 驱动使用，绝不返回给前端）。
   * 缺配置时 fail-fast，避免在未验证的存储上伪造“上传成功”。
   */
  getConfig(): StorageConfig {
    const { endpoint, region, bucket, accessKey, secretKey } = this.env.storage

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      throw new AppError(
        ERROR_CODES.FILE_UPLOAD_ERROR,
        'Object storage is not configured (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY)',
        503,
      )
    }

    return { endpoint, region: region ?? 'us-east-1', bucket, accessKey, secretKey }
  }

  /** object key：media/<yyyy>/<mm>/<uuid>.<ext>（扩展名来自已校验的 MIME） */
  buildObjectKey(mimeType: string, now?: Date, id?: string): string {
    return buildObjectKey(mimeType, now, id)
  }

  /** 公开 URL：<MEDIA_PUBLIC_BASE_URL>/<object-key> */
  buildPublicUrl(key: string): string {
    assertSafeObjectKey(key)

    return `${this.getPublicBaseUrl()}/${key}`
  }

  getPublicBaseUrl(): string {
    const configured = this.env.storage.publicBaseUrl?.trim()

    if (configured && configured.length > 0) {
      return configured.replace(/\/+$/, '')
    }

    // 本地开发默认指向后端自身的只读文件路由（main.ts 注册 /media 静态资源）
    return `http://localhost:${this.env.port}`
  }

  put(input: PutObjectInput): Promise<StoredObject> {
    return this.driver.put(input)
  }

  async delete(key: string): Promise<void> {
    assertSafeObjectKey(key)

    await this.driver.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    assertSafeObjectKey(key)

    return this.driver.exists(key)
  }
}

/**
 * 根据 STORAGE_DRIVER 选择驱动：
 * - local  → LocalStorageDriver（真实读写，无需外部服务）
 * - s3     → UnconfiguredStorageDriver（驱动在后续阶段实现；缺配置 / 未实现都 fail-fast）
 * - 其它   → UnconfiguredStorageDriver（明确报错，不静默回退）
 */
export function createStorageDriver(env: AppEnv = readEnv()): StorageDriver {
  const driver = (env.storage.driver ?? '').trim().toLowerCase() || 'local'

  if (driver === 'local') {
    return new LocalStorageDriver(resolveLocalStorageRoot(env.storage.localRoot))
  }

  if (driver === 's3') {
    const configured = Boolean(
      env.storage.endpoint && env.storage.bucket && env.storage.accessKey && env.storage.secretKey,
    )

    if (!configured) {
      return new UnconfiguredStorageDriver(
        'S3 storage is not configured (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY)',
      )
    }

    return new UnconfiguredStorageDriver(
      'S3 storage driver is not implemented in this phase (STORAGE_DRIVER=s3)',
    )
  }

  return new UnconfiguredStorageDriver(`Unknown STORAGE_DRIVER: ${driver || '(empty)'}`)
}
