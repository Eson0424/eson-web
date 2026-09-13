import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AppError, ERROR_CODES } from '../../../common/errors/app-error.js'
import { resolveLocalObjectPath } from '../object-key.js'
import type { PutObjectInput, StorageDriver, StorageDriverName, StoredObject } from '../storage.types.js'

/**
 * 本地文件系统驱动（Phase 4-F.1，开发环境默认）。
 *
 * - 文件写入 <root>/<object-key>
 * - 不覆盖已有对象（`wx`），uuid key 保证不冲突
 * - 错误信息不包含磁盘绝对路径
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name: StorageDriverName = 'local'

  constructor(private readonly root: string) {}

  getRoot(): string {
    return this.root
  }

  isWritable(): boolean {
    return true
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const target = resolveLocalObjectPath(this.root, input.key)

    try {
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, input.body, { flag: 'wx' })
    } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') {
        throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Media object already exists', 409)
      }

      throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Failed to write media object', 500)
    }

    return { key: input.key, size: input.body.byteLength, contentType: input.contentType }
  }

  async delete(key: string): Promise<void> {
    const target = resolveLocalObjectPath(this.root, key)

    try {
      await rm(target, { force: true })
    } catch {
      throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Failed to delete media object', 500)
    }
  }

  async exists(key: string): Promise<boolean> {
    const target = resolveLocalObjectPath(this.root, key)

    try {
      await access(target)

      return true
    } catch {
      return false
    }
  }
}
