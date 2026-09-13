import { SORT_FIELDS, SORT_ORDERS } from '../constants/locale.js'

/** 排序白名单（docs/API.md §23）：非法字段回退到 sortOrder */
export function buildContentOrderBy(sort?: string, order?: string) {
  const field = (SORT_FIELDS as readonly string[]).includes(sort ?? '')
    ? (sort as (typeof SORT_FIELDS)[number])
    : 'sortOrder'
  const direction = (SORT_ORDERS as readonly string[]).includes((order ?? '').toLowerCase())
    ? ((order ?? 'asc').toLowerCase() as (typeof SORT_ORDERS)[number])
    : 'asc'

  return [{ [field]: direction } as Record<string, 'asc' | 'desc'>, { createdAt: 'desc' as const }]
}

export interface MediaLike {
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

/** 只暴露 Public 需要的媒体字段 */
export function mapMedia(media: MediaLike | null) {
  if (!media) {
    return undefined
  }

  return {
    url: media.url,
    alt: media.alt ?? '',
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  }
}

export function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}
