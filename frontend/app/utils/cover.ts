import type { MediaRef } from '~/types/content'

/** http(s)://host/... 或 //host/... —— 已经是可直接使用的绝对地址 */
const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i

/**
 * 把 API 返回的媒体地址解析成浏览器可直接加载的 URL（Phase 4-F.5.1）。
 *
 * Media API 现在同时存在两种形态：
 * - 上传的媒体：`http://host/media/2026/09/<id>.png`
 * - 种子/相对路径：`/media/seed/placeholder-1.webp`
 *
 * 相对路径如果直接交给 `<img src>`，会按前端域名解析（Nuxt 与 API 不同源 → 404），
 * 因此这里统一按 API origin 解析。绝不根据 id / storageKey / 文件名拼接地址。
 */
export function resolveMediaUrl(url: string | null | undefined, apiBase: string): string | null {
  if (typeof url !== 'string') {
    return null
  }

  const trimmed = url.trim()

  if (trimmed.length === 0) {
    return null
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return trimmed
  }

  const base = typeof apiBase === 'string' ? apiBase.trim() : ''

  if (base.length === 0 || !trimmed.startsWith('/')) {
    return trimmed
  }

  try {
    return new URL(trimmed, new URL(base).origin).toString()
  } catch {
    return trimmed
  }
}

export interface CoverImage {
  src: string
  /** media.alt → 内容标题 → 空串（装饰性） */
  alt: string
  width?: number
  height?: number
}

function toPositiveInt(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined
}

/**
 * cover → 可直接渲染的视图模型。
 * 返回 null 表示「没有可用封面」，由组件显示 branded fallback（占位视觉）。
 */
export function toCoverImage(
  cover: MediaRef | null | undefined,
  options: { apiBase: string; altFallback?: string | null },
): CoverImage | null {
  if (!cover) {
    return null
  }

  const src = resolveMediaUrl(cover.src, options.apiBase)

  if (!src) {
    return null
  }

  const alt = (cover.alt ?? '').trim() || (options.altFallback ?? '').trim()
  const width = toPositiveInt(cover.width)
  const height = toPositiveInt(cover.height)

  return {
    src,
    alt,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}
