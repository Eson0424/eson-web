import { SUPPORTED_LOCALES, type AppLocale } from '~/types/locale'

/**
 * Admin 内容表单的共享基础逻辑（Work / Lab 共用）。
 * 内容特有的字段差异通过 options 控制，避免每个 CMS 复制一套校验与 payload 逻辑。
 */

export type ContentStatusValue = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface ContentTranslationForm {
  title: string
  subtitle: string
  /** Work / Lab 的摘要 */
  summary: string
  /** Writing 的摘要（writings 的翻译列为 excerpt） */
  excerpt: string
  content: string
  seoTitle: string
  seoDescription: string
}

export interface ContentFormState {
  slug: string
  status: ContentStatusValue
  featured: boolean
  sortOrder: number
  coverMediaId: string | null
  githubUrl: string
  demoUrl: string
  projectUrl: string
  publishedAt: string
  translations: Record<AppLocale, ContentTranslationForm>
  categoryIds: string[]
  tagIds: string[]
  mediaIds: string[]
  /** Work 专用（labs 表没有这两列，Lab 不使用） */
  startDate?: string
  endDate?: string
}

export interface ContentFormErrors {
  slug?: string
  translations?: Partial<Record<AppLocale, string>>
  urls?: string
}

export function createEmptyContentForm(): ContentFormState {
  const emptyTranslation = (): ContentTranslationForm => ({
    title: '',
    subtitle: '',
    summary: '',
    excerpt: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
  })

  return {
    slug: '',
    status: 'DRAFT',
    featured: false,
    sortOrder: 0,
    coverMediaId: null,
    githubUrl: '',
    demoUrl: '',
    projectUrl: '',
    publishedAt: '',
    translations: {
      'zh-CN': emptyTranslation(),
      'en-US': emptyTranslation(),
    },
    categoryIds: [],
    tagIds: [],
    mediaIds: [],
  }
}

/** Frontend validation 只是 UX；后端仍会独立校验（AGENTS §27） */
export function validateContentForm(form: ContentFormState): ContentFormErrors {
  const errors: ContentFormErrors = {}

  if (!CONTENT_SLUG_PATTERN.test(form.slug)) {
    errors.slug = 'invalid-slug'
  }

  const translationErrors: Partial<Record<AppLocale, string>> = {}

  // zh-CN 是默认语言，必须有标题；en-US 允许缺失（Admin 会显示 Translation Missing）
  if (form.translations['zh-CN'].title.trim().length === 0) {
    translationErrors['zh-CN'] = 'title-required'
  }

  for (const locale of SUPPORTED_LOCALES) {
    const title = form.translations[locale].title.trim()

    if (title.length > 200) {
      translationErrors[locale] = 'title-too-long'
    }
  }

  if (Object.keys(translationErrors).length > 0) {
    errors.translations = translationErrors
  }

  const urls = [form.githubUrl, form.demoUrl, form.projectUrl].filter((value) => value.trim().length > 0)

  if (urls.some((value) => !/^https?:\/\//.test(value.trim()))) {
    errors.urls = 'invalid-url'
  }

  return errors
}

export function hasContentFormErrors(errors: ContentFormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function contentTranslationSummary(form: ContentFormState) {
  return {
    'zh-CN': form.translations['zh-CN'].title.trim().length > 0,
    'en-US': form.translations['en-US'].title.trim().length > 0,
    missing: SUPPORTED_LOCALES.filter(
      (locale) => form.translations[locale].title.trim().length === 0,
    ),
  }
}

/** 用 type alias（而非 interface）：这样可以直接赋给 Record<string, unknown> 形式的 API body */
export type ContentPayload = {
  slug: string
  status: ContentStatusValue
  featured: boolean
  sortOrder: number
  coverMediaId: string | null
  publishedAt: string | null
  translations: Array<Record<string, unknown>>
  categoryIds: string[]
  tagIds: string[]
  mediaIds: string[]
  /** Work / Lab 的链接列（writings 没有，必须完全省略） */
  githubUrl?: string | null
  demoUrl?: string | null
  projectUrl?: string | null
  startDate?: string | null
  endDate?: string | null
}

/** 只发送有内容的翻译（空翻译不写入数据库，保持 Translation Missing 语义） */
export function toContentPayload(
  form: ContentFormState,
  options: {
    includeDates?: boolean
    includeLinks?: boolean
    translationField?: 'summary' | 'excerpt'
  } = {},
): ContentPayload {
  const translationField = options.translationField ?? 'summary'
  const includeLinks = options.includeLinks ?? true

  return {
    slug: form.slug.trim(),
    status: form.status,
    featured: form.featured,
    sortOrder: form.sortOrder,
    coverMediaId: form.coverMediaId,
    ...(includeLinks
      ? {
          githubUrl: form.githubUrl.trim() || null,
          demoUrl: form.demoUrl.trim() || null,
          projectUrl: form.projectUrl.trim() || null,
        }
      : {}),
    publishedAt: form.publishedAt || null,
    ...(options.includeDates
      ? { startDate: form.startDate || null, endDate: form.endDate || null }
      : {}),
    translations: SUPPORTED_LOCALES.filter(
      (locale) => form.translations[locale].title.trim().length > 0,
    ).map((locale) => ({
      locale,
      title: form.translations[locale].title.trim(),
      subtitle: form.translations[locale].subtitle.trim() || undefined,
      ...(translationField === 'excerpt'
        ? { excerpt: form.translations[locale].excerpt.trim() || undefined }
        : { summary: form.translations[locale].summary.trim() || undefined }),
      content: form.translations[locale].content || undefined,
      seoTitle: form.translations[locale].seoTitle.trim() || undefined,
      seoDescription: form.translations[locale].seoDescription.trim() || undefined,
    })),
    categoryIds: form.categoryIds,
    tagIds: form.tagIds,
    mediaIds: form.mediaIds,
  }
}

export interface AdminContentDetailLike {
  slug: string
  status: ContentStatusValue
  featured: boolean
  sortOrder: number
  coverMediaId: string | null
  githubUrl: string | null
  demoUrl: string | null
  projectUrl: string | null
  publishedAt: string | null
  translations: Array<{
    locale: string
    title: string
    subtitle: string | null
    summary?: string | null
    excerpt?: string | null
    content: string | null
    seoTitle: string | null
    seoDescription: string | null
  }>
  categoryIds: string[]
  tagIds: string[]
  mediaIds: string[]
  /** Work 专用 */
  startDate?: string | null
  endDate?: string | null
}

export function fromContentDetail(
  detail: AdminContentDetailLike,
  options: { includeDates?: boolean; translationField?: 'summary' | 'excerpt' } = {},
): ContentFormState {
  const translationField = options.translationField ?? 'summary'
  const form = createEmptyContentForm()

  form.slug = detail.slug
  form.status = detail.status
  form.featured = detail.featured
  form.sortOrder = detail.sortOrder
  form.coverMediaId = detail.coverMediaId
  form.githubUrl = detail.githubUrl ?? ''
  form.demoUrl = detail.demoUrl ?? ''
  form.projectUrl = detail.projectUrl ?? ''
  form.publishedAt = detail.publishedAt ? detail.publishedAt.slice(0, 10) : ''
  form.categoryIds = [...detail.categoryIds]
  form.tagIds = [...detail.tagIds]
  form.mediaIds = [...detail.mediaIds]

  if (options.includeDates) {
    form.startDate = detail.startDate ?? ''
    form.endDate = detail.endDate ?? ''
  }

  for (const translation of detail.translations) {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(translation.locale)) {
      continue
    }

    const locale = translation.locale as AppLocale

    form.translations[locale] = {
      title: translation.title,
      subtitle: translation.subtitle ?? '',
      summary: translationField === 'summary' ? (translation.summary ?? '') : '',
      excerpt: translationField === 'excerpt' ? (translation.excerpt ?? '') : '',
      content: translation.content ?? '',
      seoTitle: translation.seoTitle ?? '',
      seoDescription: translation.seoDescription ?? '',
    }
  }

  return form
}

/** 脏状态比较：用于离开页面警告（保存成功后重置 baseline） */
export function isContentFormDirty(baseline: ContentFormState, current: ContentFormState): boolean {
  return JSON.stringify(baseline) !== JSON.stringify(current)
}
