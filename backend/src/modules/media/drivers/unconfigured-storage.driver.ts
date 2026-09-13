import { AppError, ERROR_CODES } from '../../../common/errors/app-error.js'
import type { StorageDriver, StorageDriverName, StoredObject } from '../storage.types.js'

/**
 * 不可用驱动（Phase 4-F.1 fail-fast）。
 *
 * 用于：STORAGE_DRIVER=s3（S3 驱动在后续阶段实现）/ 驱动名非法。
 * 任何存储操作都返回 503 FILE_UPLOAD_ERROR —— 绝不伪造“上传成功”。
 * 错误信息不含任何凭证。
 */
export class UnconfiguredStorageDriver implements StorageDriver {
  readonly name: StorageDriverName = 'unconfigured'

  constructor(private readonly reason: string) {}

  isWritable(): boolean {
    return false
  }

  unavailableReason(): string {
    return this.reason
  }

  private fail(): never {
    throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, this.reason, 503)
  }

  async put(): Promise<StoredObject> {
    return this.fail()
  }

  async delete(): Promise<void> {
    return this.fail()
  }

  async exists(): Promise<boolean> {
    return this.fail()
  }
}
