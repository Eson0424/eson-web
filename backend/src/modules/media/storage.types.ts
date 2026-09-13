/**
 * 对象存储驱动契约（Phase 4-F.1）。
 *
 * 设计原则（docs/ARCHITECTURE.md §28）：
 * - 文件本体只存在于对象存储 / 本地磁盘，绝不写入 PostgreSQL
 * - StorageService 是对外门面，驱动只负责「写 / 删 / 存在性」
 * - 驱动不可用时必须 fail-fast，绝不伪造“上传成功”
 */
export type StorageDriverName = 'local' | 's3' | 'unconfigured'

export interface PutObjectInput {
  /** 由 buildObjectKey() 生成的 object key（不接受客户端传入） */
  key: string
  body: Buffer
  /** 经过校验的 MIME type，写入对象存储的 Content-Type */
  contentType: string
}

export interface StoredObject {
  key: string
  size: number
  contentType: string
}

export interface StorageDriver {
  readonly name: StorageDriverName

  /** 当前驱动是否可写入（s3 / unconfigured 在未就绪时返回 false） */
  isWritable(): boolean

  /** 不可用原因（不含任何凭证），用于 fail-fast 的错误信息 */
  unavailableReason?(): string

  put(input: PutObjectInput): Promise<StoredObject>

  delete(key: string): Promise<void>

  exists(key: string): Promise<boolean>
}
