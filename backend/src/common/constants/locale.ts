/** Locale 优先级：query → Accept-Language → zh-CN（docs/API.md §8） */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

/** 排序白名单：禁止客户端传入任意字段（docs/API.md §23） */
export const SORT_FIELDS = ['createdAt', 'updatedAt', 'publishedAt', 'sortOrder'] as const
export type SortField = (typeof SORT_FIELDS)[number]
export const SORT_ORDERS = ['asc', 'desc'] as const
export type SortOrder = (typeof SORT_ORDERS)[number]

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** 解析 locale：显式 query 优先，其次 Accept-Language，最后默认 zh-CN */
export function resolveLocale(queryLocale?: string, acceptLanguage?: string): SupportedLocale {
  if (isSupportedLocale(queryLocale)) {
    return queryLocale
  }

  if (acceptLanguage) {
    for (const part of acceptLanguage.split(',')) {
      const tag = part.split(';')[0]?.trim()

      if (isSupportedLocale(tag)) {
        return tag
      }

      const base = tag?.split('-')[0]?.toLowerCase()

      if (base === 'zh') {
        return 'zh-CN'
      }

      if (base === 'en') {
        return 'en-US'
      }
    }
  }

  return DEFAULT_LOCALE
}
