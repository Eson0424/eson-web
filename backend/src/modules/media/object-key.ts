import path from 'node:path'
import { AppError, ERROR_CODES } from '../../common/errors/app-error.js'

/**
 * Media object key 策略（Phase 4-F.1）。
 *
 * 重要：不使用客户端原始文件名拼 object key。
 * 统一格式：media/<yyyy>/<mm>/<uuid>.<ext>
 * - 不接受客户端传入 key
 * - 不包含目录跳转 / 用户输入
 * - 不依赖原始文件名（原始名只进 DB 展示字段）
 * - 扩展名来自「已校验的 MIME」，不是来自 filename
 */

export const MEDIA_KEY_PREFIX = 'media'

/** 允许的图片 MIME → object key 扩展名（和 docs/API.md §16.1 的白名单一致） */
export const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

const SAFE_KEY_PATTERN =
  /^media\/\d{4}\/(0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/

/** 生成 object key；MIME 不在白名单内直接失败（422） */
export function buildObjectKey(
  mimeType: string,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): string {
  const extension = IMAGE_EXTENSION_BY_MIME[mimeType.trim().toLowerCase()]

  if (!extension) {
    throw new AppError(
      ERROR_CODES.FILE_UPLOAD_ERROR,
      `Unsupported mime type: ${mimeType}`,
      422,
    )
  }

  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')

  return `${MEDIA_KEY_PREFIX}/${year}/${month}/${id}.${extension}`
}

/** key 必须严格符合本策略，任何其它形式一律拒绝（防目录跳转 / 绝对路径 / 空字节） */
export function isSafeObjectKey(key: unknown): key is string {
  return typeof key === 'string' && SAFE_KEY_PATTERN.test(key)
}

export function assertSafeObjectKey(key: unknown): asserts key is string {
  if (!isSafeObjectKey(key)) {
    throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Invalid media object key', 400)
  }
}

/**
 * 本地对象存储「bucket 根」：显式配置优先，默认 <backend cwd>/.data。
 *
 * object key 形如 `media/<yyyy>/<mm>/<uuid>.<ext>`，因此磁盘布局是
 * `.data/media/2026/09/<uuid>.png` —— 与生产 S3 bucket + key 的结构完全一致。
 * `.data/` 已被 .gitignore 忽略。
 */
export function resolveLocalStorageRoot(explicitRoot?: string, cwd: string = process.cwd()): string {
  const trimmed = explicitRoot?.trim()

  if (!trimmed) {
    return path.resolve(cwd, '.data')
  }

  // 相对路径按调用方给出的基准目录解析（应用运行时即 process.cwd()）
  return path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(cwd, trimmed)
}

/** 把 object key 解析为磁盘路径，并确认结果仍位于 root 之内 */
export function resolveLocalObjectPath(root: string, key: unknown): string {
  assertSafeObjectKey(key)

  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, key)
  const relative = path.relative(resolvedRoot, resolved)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'Invalid media object key', 400)
  }

  return resolved
}
