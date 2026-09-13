/**
 * Admin Media Library 的纯函数工具（Phase 4-F.4）。
 *
 * 前端校验只是 UX；后端 MediaService.upload() 仍是最终权威校验。
 */

export const MEDIA_PAGE_SIZE = 24

export const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_MEDIA_PIXELS = 40_000_000

export const ACCEPTED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

export const ACCEPTED_MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const

/** 用于 <input type="file"> 的 accept 属性 */
export const ACCEPTED_MEDIA_ACCEPT = ACCEPTED_MEDIA_MIME_TYPES.join(',')

/** 已知稳定失败原因（只映射已知 reason，避免渲染任意 i18n key） */
export const MEDIA_ERROR_REASONS = [
  'FILE_MISSING',
  'FILE_EMPTY',
  'FILE_TOO_LARGE',
  'MIME_NOT_ALLOWED',
  'EXTENSION_NOT_ALLOWED',
  'SIGNATURE_MISMATCH',
  'MIME_MISMATCH',
  'EXTENSION_MISMATCH',
  'IMAGE_TOO_LARGE',
  'DIMENSIONS_UNREADABLE',
  'MALFORMED_UPLOAD',
  'STORAGE_UNAVAILABLE',
  'STORAGE_WRITE_FAILED',
  'STORAGE_DELETE_FAILED',
  'MEDIA_NOT_FOUND',
  'MEDIA_IN_USE',
  'DATABASE_ERROR',
] as const

export type MediaErrorReason = (typeof MEDIA_ERROR_REASONS)[number]

export interface MediaReferenceCounts {
  worksCover: number
  labsCover: number
  writingsCover: number
  workMedia: number
  labMedia: number
  writingMedia: number
  total?: number
}

export interface MediaReferenceLine {
  key: string
  count: number
}

export interface MediaFileLike {
  name: string
  type: string
  size: number
}

export type MediaClientValidation = { ok: true } | { ok: false; reasonKey: string }

/** 从 API 错误（envelope 或已解包 details）中读取稳定 reason */
export function readMediaErrorReason(error: unknown): MediaErrorReason | null {
  const candidate = error as
    | { data?: { error?: { details?: unknown } }; details?: unknown }
    | null
    | undefined

  const details = candidate?.data?.error?.details ?? candidate?.details

  if (!Array.isArray(details) || details.length === 0) {
    return null
  }

  const reason = (details[0] as { reason?: unknown } | undefined)?.reason

  return typeof reason === 'string' && (MEDIA_ERROR_REASONS as readonly string[]).includes(reason)
    ? (reason as MediaErrorReason)
    : null
}

/** 把 API 错误映射成 i18n key（未知原因回退到 unknown） */
export function mediaErrorKey(error: unknown): string {
  const reason = readMediaErrorReason(error)

  return reason ? `admin.media.errors.${reason}` : 'admin.media.errors.unknown'
}

/** 删除被拒时展示的引用明细（只展示后端真实返回的计数） */
export function readMediaReferences(error: unknown): MediaReferenceLine[] {
  const candidate = error as { data?: { error?: { details?: unknown } }; details?: unknown } | null | undefined
  const details = candidate?.data?.error?.details ?? candidate?.details

  if (!Array.isArray(details) || details.length === 0) {
    return []
  }

  const references = (details[0] as { references?: unknown } | undefined)?.references

  if (!references || typeof references !== 'object') {
    return []
  }

  return mediaReferenceLines(references as MediaReferenceCounts)
}

export function mediaReferenceLines(references: MediaReferenceCounts): MediaReferenceLine[] {
  const mapping: Array<[keyof MediaReferenceCounts, string]> = [
    ['worksCover', 'workCover'],
    ['labsCover', 'labCover'],
    ['writingsCover', 'writingCover'],
    ['workMedia', 'workGallery'],
    ['labMedia', 'labGallery'],
    ['writingMedia', 'writingGallery'],
  ]

  return mapping
    .map(([field, key]) => ({ key: `admin.media.references.${key}`, count: Number(references[field] ?? 0) }))
    .filter((line) => Number.isFinite(line.count) && line.count > 0)
}

/** 客户端预检（格式 + 大小）；不替代后端校验 */
export function validateMediaFile(file: MediaFileLike | null | undefined): MediaClientValidation {
  if (!file) {
    return { ok: false, reasonKey: 'admin.media.errors.FILE_MISSING' }
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, reasonKey: 'admin.media.errors.FILE_EMPTY' }
  }

  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    return { ok: false, reasonKey: 'admin.media.errors.FILE_TOO_LARGE' }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!(ACCEPTED_MEDIA_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, reasonKey: 'admin.media.errors.EXTENSION_NOT_ALLOWED' }
  }

  if (!(ACCEPTED_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reasonKey: 'admin.media.errors.MIME_NOT_ALLOWED' }
  }

  return { ok: true }
}

/**
 * 可选的前端像素预检查（best-effort）。
 * 无法读取尺寸时返回 null（交给后端权威校验），绝不因此阻断上传。
 */
export async function checkMediaPixelLimit(file: File): Promise<string | null> {
  if (typeof window === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return null
  }

  return await new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    const finish = (result: string | null) => {
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }

    image.onload = () => {
      const pixels = image.naturalWidth * image.naturalHeight

      finish(pixels > MAX_MEDIA_PIXELS ? 'admin.media.errors.IMAGE_TOO_LARGE' : null)
    }

    image.onerror = () => finish(null)
    image.src = objectUrl
  })
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '—'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`
}

export function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (!width || !height || width <= 0 || height <= 0) {
    return '—'
  }

  return `${width} × ${height}`
}

export function formatMediaDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toISOString().slice(0, 10)
}

export function mediaDisplayName(item: { filename?: string | null; originalFilename?: string | null }): string {
  return item.originalFilename || item.filename || '—'
}

/** alt 规范化：空串视为清空（后端接受 null） */
export function normalizeAltInput(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}
