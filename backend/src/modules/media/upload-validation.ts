import { ERROR_CODES, AppError } from '../../common/errors/app-error.js'
import {
  IMAGE_MIME_BY_EXTENSION,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  detectImageMimeType,
  readImageDimensions,
  type SupportedImageMimeType,
} from './image-inspection.js'

/**
 * 上传校验（Phase 4-F.2）。
 *
 * 依次执行：文件存在 → 大小 → 声明 MIME → 扩展名 → magic bytes → 尺寸 / 像素上限。
 * 客户端 filename / Content-Type 只用于「一致性校验」与展示 metadata，
 * 绝不用于生成 object key（docs/ARCHITECTURE.md §28）。
 *
 * 所有失败都使用稳定的顶层 error code（FILE_UPLOAD_ERROR / VALIDATION_ERROR），
 * 具体原因放在 details[0].reason，便于 4-F.3 的 API 层原样返回。
 */

export type UploadFailureReason =
  | 'FILE_MISSING'
  | 'FILE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'MIME_NOT_ALLOWED'
  | 'EXTENSION_NOT_ALLOWED'
  | 'SIGNATURE_MISMATCH'
  | 'MIME_MISMATCH'
  | 'EXTENSION_MISMATCH'
  | 'DIMENSIONS_UNREADABLE'
  | 'IMAGE_TOO_LARGE'
  | 'MALFORMED_UPLOAD'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_DELETE_FAILED'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_IN_USE'
  | 'DATABASE_ERROR'

const MAX_ALT_LENGTH = 500
const MAX_FILENAME_LENGTH = 255

export interface UploadFailureDetail {
  reason: UploadFailureReason
  /** 可选的结构化补充信息（绝不含文件内容 / 磁盘路径 / 凭证） */
  hint?: string
}

export interface UploadCandidateInput {
  buffer?: Buffer | null
  /** 客户端声明的 MIME（multipart Content-Type），仅用于一致性校验 */
  declaredMimeType?: string | null
  /** 客户端原始文件名，仅用于展示 metadata */
  originalFilename?: string | null
  alt?: string | null
}

export interface ValidatedUpload {
  buffer: Buffer
  mimeType: SupportedImageMimeType
  width: number
  height: number
  size: number
  /** 规范化后的展示名称；未提供文件名时为 null（由调用方用 object key 兜底） */
  filename: string | null
  /** 原始文件名的安全副本（仅展示） */
  originalFilename: string | null
  alt: string | null
}

/** 稳定错误：顶层 code 不变，原因放在 details[0].reason */
export function uploadFailure(
  reason: UploadFailureReason,
  message: string,
  status: number,
  hint?: string,
): AppError {
  const details: UploadFailureDetail[] = [hint ? { reason, hint } : { reason }]

  return new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, message, status, details)
}

export function validateUploadCandidate(input: UploadCandidateInput): ValidatedUpload {
  const buffer = input.buffer

  // 1. 文件存在
  if (!Buffer.isBuffer(buffer)) {
    throw uploadFailure('FILE_MISSING', 'No file was provided', 400)
  }

  if (buffer.byteLength === 0) {
    throw uploadFailure('FILE_EMPTY', 'The uploaded file is empty', 400)
  }

  // 2. 文件大小（以真实字节数为准，不信任客户端声明的 size）
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw uploadFailure('FILE_TOO_LARGE', 'File exceeds the 10MB limit', 422)
  }

  // 3. 声明 MIME 必须属于白名单
  const declaredMimeType = (input.declaredMimeType ?? '').trim().toLowerCase()

  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(declaredMimeType)) {
    throw uploadFailure(
      'MIME_NOT_ALLOWED',
      'Unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/avif',
      422,
      declaredMimeType || undefined,
    )
  }

  // 4. 扩展名白名单（客户端名称仅用于校验与展示）
  const originalFilename = sanitizeFilename(input.originalFilename)
  const extension = originalFilename ? filenameExtension(originalFilename) : null

  if (originalFilename && (!extension || !(extension in IMAGE_MIME_BY_EXTENSION))) {
    throw uploadFailure(
      'EXTENSION_NOT_ALLOWED',
      'Unsupported file extension. Allowed: jpg, jpeg, png, webp, avif',
      422,
      extension ?? undefined,
    )
  }

  // 5. magic bytes：以文件真实签名为准
  const detectedMimeType = detectImageMimeType(buffer)

  if (!detectedMimeType) {
    throw uploadFailure(
      'SIGNATURE_MISMATCH',
      'The file content does not match any allowed image format',
      422,
    )
  }

  if (detectedMimeType !== declaredMimeType) {
    throw uploadFailure(
      'MIME_MISMATCH',
      'The declared content type does not match the file content',
      422,
      `declared=${declaredMimeType}; detected=${detectedMimeType}`,
    )
  }

  if (extension && IMAGE_MIME_BY_EXTENSION[extension] !== detectedMimeType) {
    throw uploadFailure(
      'EXTENSION_MISMATCH',
      'The file extension does not match the file content',
      422,
      `extension=${extension}; detected=${detectedMimeType}`,
    )
  }

  // 6. 尺寸 / 像素上限
  const dimensions = readImageDimensions(buffer, detectedMimeType)

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    throw uploadFailure('DIMENSIONS_UNREADABLE', 'Unable to read image dimensions', 422)
  }

  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    throw uploadFailure('IMAGE_TOO_LARGE', 'Image exceeds the 40MP limit', 422)
  }

  return {
    buffer,
    mimeType: detectedMimeType,
    width: dimensions.width,
    height: dimensions.height,
    size: buffer.byteLength,
    filename: originalFilename,
    originalFilename,
    alt: validateAltText(input.alt),
  }
}

/** alt 文案：去空白，空串视为未提供，限制长度 */
export function validateAltText(alt?: string | null): string | null {
  if (typeof alt !== 'string') {
    return null
  }

  const trimmed = alt.trim()

  if (trimmed.length === 0) {
    return null
  }

  if (trimmed.length > MAX_ALT_LENGTH) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `alt must be at most ${MAX_ALT_LENGTH} characters`,
      400,
    )
  }

  return trimmed
}

/**
 * 展示用文件名规范化：
 * - 去掉空字节与控制字符
 * - 去掉任何路径分隔符（防 traversal / 绝对路径）
 * - 去掉开头的点（避免隐藏文件 / `..`）
 * - 限制长度；结果为空则返回 null（调用方用 object key 兜底）
 */
export function sanitizeFilename(name?: string | null): string | null {
  if (typeof name !== 'string') {
    return null
  }

  const cleaned = name
    .replace(/\0/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    // 去掉任何 `..` 序列（防 traversal 痕迹）
    .replace(/\.\./g, '')
    // 折叠连续分隔符
    .replace(/-{2,}/g, '-')
    // 去掉开头的点与分隔符
    .replace(/^[.-]+/, '')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)

  return cleaned.length > 0 ? cleaned : null
}

function filenameExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return null
  }

  return filename.slice(lastDot + 1).toLowerCase()
}
