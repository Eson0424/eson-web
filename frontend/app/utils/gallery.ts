import type { MediaRef } from '~/types/content'

/** 缺少固有尺寸时使用的稳定容器比例（避免 CLS，不裁切内容） */
export const GALLERY_FALLBACK_RATIO = '16 / 10'

export interface GalleryImageLayout {
  /** null = 使用图片固有比例（width / height 已知） */
  ratio: string | null
  fit: 'none' | 'contain'
}

/**
 * Gallery 图片布局决策（Phase 4-F.6.2，已批准「原始比例、禁止裁切」）：
 * - 已知 width/height → 固有比例：不加 ratio、不加 object-cover
 * - 缺少尺寸 → 稳定的容器比例 + object-contain（不裁切、不变形、不塌陷）
 */
export function toGalleryImageLayout(
  media?: MediaRef | null,
  fallbackRatio: string = GALLERY_FALLBACK_RATIO,
): GalleryImageLayout {
  const hasIntrinsicSize = Boolean(media?.width && media.height)

  return hasIntrinsicSize
    ? { ratio: null, fit: 'none' }
    : { ratio: fallbackRatio, fit: 'contain' }
}

/** caption 为 null / undefined / 空白时不渲染 DOM（也不自动生成） */
export function normalizeGalleryCaption(caption: string | null | undefined): string | null {
  if (typeof caption !== 'string') {
    return null
  }

  const trimmed = caption.trim()

  return trimmed.length > 0 ? trimmed : null
}

export interface GalleryRenderRow<T> {
  id: string
  media: MediaRef | null
  caption: string | null
  source: T
}

/**
 * Gallery 渲染行：只做「顺序不变」的映射与 caption 归一化。
 * 不排序、不反转、不去重（顺序由 backend sort_order 决定）。
 */
export function toGalleryRows<T extends { id: string; caption: string; media?: MediaRef }>(
  items: readonly T[],
): Array<GalleryRenderRow<T>> {
  return items.map((item) => ({
    id: item.id,
    media: item.media ?? null,
    caption: normalizeGalleryCaption(item.caption),
    source: item,
  }))
}
