import { DEFAULT_LOCALE, type SupportedLocale } from '../../../common/constants/locale.js'
import { mapMedia, toDateString } from '../../../common/utils/content-mapping.js'
import { pickTranslation } from '../../../common/utils/translation.js'

interface MediaRecord {
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

interface TranslationRecord {
  locale: string
  title: string
  subtitle: string | null
  content: string | null
  seoTitle: string | null
  seoDescription: string | null
  /** Work / Lab 的摘要列 */
  summary?: string | null
  /** Writing 的摘要列 */
  excerpt?: string | null
}

interface TaxonomyRecord {
  id: string
  slug: string
  translations: Array<{ locale: string; name: string }>
}

/**
 * Admin 内容记录的最小结构：Work / Lab 的 Prisma payload 都满足它
 * （startDate / endDate 只有 Work 有，因此为可选）。
 */
export interface AdminContentRecord {
  id: string
  slug: string
  status: string
  featured: boolean
  sortOrder: number
  coverMediaId: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  cover: MediaRecord | null
  translations: TranslationRecord[]
  categories: Array<{ category: TaxonomyRecord }>
  tags: Array<{ tag: TaxonomyRecord }>
  media: Array<{ mediaId: string; media: MediaRecord }>
  /** Work / Lab 的链接列（writings 没有） */
  githubUrl?: string | null
  demoUrl?: string | null
  projectUrl?: string | null
  /** Work 的起止日期 */
  startDate?: Date | null
  endDate?: Date | null
  /** Writing 的预计阅读时长 */
  readingTime?: number | null
}

export interface AdminContentMapping {
  /** Work：startDate / endDate */
  dates?: boolean
  /** Work / Lab：githubUrl / demoUrl / projectUrl */
  links?: boolean
  /** 翻译摘要列：Work / Lab 用 summary（默认），Writing 用 excerpt */
  translationField?: 'summary' | 'excerpt'
}

/** Admin 列表项：标题与分类/标签名按 locale 选择，并标记翻译缺失 */
export function mapAdminContentListItem(record: AdminContentRecord, locale: SupportedLocale) {
  const picked = pickTranslation(record.translations, locale)
  const locales = record.translations.map((translation) => translation.locale)

  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    featured: record.featured,
    title: picked?.translation.title ?? record.slug,
    locale: picked?.translation.locale ?? DEFAULT_LOCALE,
    translationStatus: {
      'zh-CN': locales.includes('zh-CN'),
      'en-US': locales.includes('en-US'),
    },
    missingLocales: ['zh-CN', 'en-US'].filter((item) => !locales.includes(item)),
    categories: record.categories.map((link) => ({
      id: link.category.id,
      slug: link.category.slug,
      name: pickTranslation(link.category.translations, locale)?.translation.name ?? link.category.slug,
    })),
    tags: record.tags.map((link) => ({
      id: link.tag.id,
      slug: link.tag.slug,
      name: pickTranslation(link.tag.translations, locale)?.translation.name ?? link.tag.slug,
    })),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** Admin 详情：包含全部 translations 与关系 ID，供编辑表单回填 */
export function mapAdminContentDetail(record: AdminContentRecord, mapping: AdminContentMapping = {}) {
  const translationField = mapping.translationField ?? 'summary'

  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    featured: record.featured,
    sortOrder: record.sortOrder,
    coverMediaId: record.coverMediaId,
    cover: mapMedia(record.cover) ?? null,
    ...(mapping.links
      ? {
          githubUrl: record.githubUrl,
          demoUrl: record.demoUrl,
          projectUrl: record.projectUrl,
        }
      : {}),
    ...(mapping.dates
      ? {
          startDate: toDateString(record.startDate ?? null),
          endDate: toDateString(record.endDate ?? null),
        }
      : {}),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      subtitle: translation.subtitle,
      content: translation.content,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      ...(translationField === 'excerpt'
        ? { excerpt: translation.excerpt ?? null }
        : { summary: translation.summary ?? null }),
    })),
    categoryIds: record.categories.map((link) => link.category.id),
    tagIds: record.tags.map((link) => link.tag.id),
    mediaIds: record.media.map((link) => link.mediaId),
    coverMedia: mapMedia(record.cover) ?? null,
  }
}
