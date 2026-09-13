import { ERROR_CODES, AppError } from '../../common/errors/app-error.js'
import { uploadFailure } from './upload-validation.js'

/**
 * Media 专用错误（Phase 4-F.3）。
 *
 * 顶层 code 复用项目已有稳定码（NOT_FOUND / CONFLICT / FILE_UPLOAD_ERROR / INTERNAL_ERROR），
 * 细粒度原因放在 details[0].reason —— 与 4-F.2 的上传错误保持同一约定。
 */

export interface MediaReferenceSummary {
  /** works.cover_media_id */
  worksCover: number
  /** labs.cover_media_id */
  labsCover: number
  /** writings.cover_media_id */
  writingsCover: number
  /** work_media */
  workMedia: number
  /** lab_media */
  labMedia: number
  /** writing_media */
  writingMedia: number
  total: number
}

export function mediaNotFound(mediaId: string): AppError {
  return new AppError(ERROR_CODES.NOT_FOUND, 'Media not found', 404, [
    { reason: 'MEDIA_NOT_FOUND', mediaId },
  ])
}

/** 仍被 Work / Lab / Writing（cover 或 gallery）引用：不解除关系、不删除 */
export function mediaInUse(references: MediaReferenceSummary): AppError {
  return new AppError(ERROR_CODES.CONFLICT, 'Media is in use by existing content', 409, [
    { reason: 'MEDIA_IN_USE', references },
  ])
}

/** 存储删除失败：DB 行保持不变，返回 503（不泄露路径 / stack / 凭证） */
export function storageDeleteFailed(): AppError {
  return uploadFailure('STORAGE_DELETE_FAILED', 'Failed to delete the stored media file', 503)
}

/** DB 操作失败（存储已完成删除）：返回稳定 500，细节只进结构化日志 */
export function mediaDatabaseFailure(operation: 'delete' | 'update'): AppError {
  return new AppError(ERROR_CODES.INTERNAL_ERROR, 'Media database operation failed', 500, [
    { reason: 'DATABASE_ERROR', operation },
  ])
}

/**
 * multipart transport 层校验错误（ParseFilePipe / MaxFileSizeValidator / FileTypeValidator）
 * → 转换为与 4-F.2 一致的稳定错误，避免同一失败原因在 HTTP 层与 service 层返回不同 code。
 */
export function mapMultipartValidationError(message: string): AppError {
  if (/expected size is less than/i.test(message)) {
    return uploadFailure('FILE_TOO_LARGE', 'File exceeds the 10MB limit', 422)
  }

  if (/expected type is/i.test(message)) {
    return uploadFailure(
      'MIME_NOT_ALLOWED',
      'Unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/avif',
      422,
    )
  }

  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400)
}

/** multer 自身的限制错误（例如超出 limits.fileSize） */
export function mapMulterError(code: string): AppError {
  if (code === 'LIMIT_FILE_SIZE') {
    return uploadFailure('FILE_TOO_LARGE', 'File exceeds the 10MB limit', 422)
  }

  return uploadFailure('MALFORMED_UPLOAD', 'Malformed multipart upload', 400)
}
