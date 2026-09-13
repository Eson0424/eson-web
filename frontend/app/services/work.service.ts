import type { WorkSummary } from '~/types/content'
import type { WorkDetail, WorkGalleryItem } from '~/types/work'
import { toWorkSections } from '~/utils/content'
import { useApiClient } from './api'

/** API 列表项（docs/API.md §10） */
export interface ApiMedia {
  url: string
  alt: string
  width?: number
  height?: number
}

/** Public detail 的 gallery 项（Phase 4-F.6.1）；顺序由 backend sort_order 保证 */
export interface ApiGalleryItem {
  id: string
  caption: string | null
  sortOrder?: number
  media?: ApiMedia
}

interface ApiWork {
  id: string
  slug: string
  title: string
  subtitle?: string
  summary: string
  content?: string | null
  featured: boolean
  year?: string
  cover?: ApiMedia
  gallery?: ApiGalleryItem[]
  categories: string[]
  tags: string[]
  startDate?: string | null
  endDate?: string | null
  publishedAt?: string | null
  githubUrl?: string
  demoUrl?: string
  projectUrl?: string
}

interface ApiListMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface WorkListResult {
  items: WorkSummary[]
  meta: ApiListMeta
}

export function useWorkService() {
  const { request } = useApiClient()

  async function list(locale: string, query: Record<string, unknown> = {}): Promise<WorkListResult> {
    const response = await request<ApiWork[] | { data: ApiWork[]; meta: ApiListMeta }>('/work', {
      query: { locale, pageSize: 100, ...query },
    })

    const items = Array.isArray(response) ? response : response.data

    return {
      items: items.map(toWorkSummary),
      meta: Array.isArray(response)
        ? { page: 1, pageSize: items.length, total: items.length, totalPages: 1 }
        : response.meta,
    }
  }

  async function detail(slug: string, locale: string): Promise<WorkDetail> {
    const work = await request<ApiWork>(`/work/${slug}`, { query: { locale } })

    return {
      ...toWorkSummary(work),
      sections: toWorkSections(work.content, work.title),
      seoTitle: work.title,
      seoDescription: work.summary,
      gallery: toGalleryItems(work.gallery),
    }
  }

  return { list, detail }
}

function toWorkSummary(work: ApiWork): WorkSummary {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    subtitle: work.subtitle,
    summary: work.summary,
    categories: work.categories ?? [],
    technologies: work.tags ?? [],
    year: work.year,
    cover: toMediaRef(work.cover),
    featured: work.featured,
    startDate: work.startDate ?? undefined,
    endDate: work.endDate ?? null,
    publishedAt: work.publishedAt ?? undefined,
    githubUrl: work.githubUrl,
    demoUrl: work.demoUrl,
    projectUrl: work.projectUrl,
  }
}

/** API 返回 cover.url；前端视图模型使用 MediaRef.src（AGENTS §38 的映射层） */
export function toMediaRef(media?: ApiMedia) {
  if (!media) {
    return undefined
  }

  return {
    src: media.url,
    alt: media.alt ?? '',
    width: media.width,
    height: media.height,
  }
}

/**
 * Public gallery：只做映射。
 * 顺序完全沿用 API（backend 已按 sort_order asc 返回）：不排序、不反转、不去重，
 * cover 同时出现在 gallery 时也保持原样（Phase 4-F.6.1 §9/§14）。
 */
export function toGalleryItems(items?: ApiGalleryItem[]): WorkGalleryItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => ({
    id: item.id,
    // caption 当前恒为 NULL：保持 optional 语义，不伪造内容
    caption: item.caption ?? '',
    media: toMediaRef(item.media),
  }))
}
