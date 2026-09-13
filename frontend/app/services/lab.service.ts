import type { LabDetail, LabStatus, LabSummary } from '~/types/lab'
import { toLabSections } from '~/utils/content'
import { useApiClient } from './api'
import { toGalleryItems, toMediaRef, type ApiGalleryItem } from './work.service'

interface ApiLab {
  id: string
  slug: string
  title: string
  subtitle?: string
  summary: string
  content?: string | null
  featured: boolean
  cover?: { url: string; alt: string; width?: number; height?: number }
  gallery?: ApiGalleryItem[]
  categories: string[]
  tags: string[]
  publishedAt?: string | null
  githubUrl?: string
  demoUrl?: string
  projectUrl?: string
}

/**
 * 数据库中没有“实验阶段”字段（DATABASE §13 只有发布状态），
 * 因此 Lab 的展示状态由内容侧另行维护；API 接入阶段统一回退为 research，
 * 待 Admin 引入阶段字段后再映射。
 */
const DEFAULT_LAB_STATUS: LabStatus = 'research'

export function useLabService() {
  const { request } = useApiClient()

  async function list(locale: string, query: Record<string, unknown> = {}) {
    const response = await request<{ data: ApiLab[]; meta: unknown } | ApiLab[]>('/lab', {
      query: { locale, pageSize: 100, ...query },
    })
    const items = Array.isArray(response) ? response : response.data

    return { items: items.map(toLabSummary) }
  }

  async function detail(slug: string, locale: string): Promise<LabDetail> {
    const lab = await request<ApiLab>(`/lab/${slug}`, { query: { locale } })

    return {
      ...toLabSummary(lab),
      sections: toLabSections(lab.content, lab.title),
      seoTitle: lab.title,
      seoDescription: lab.summary,
      gallery: toGalleryItems(lab.gallery),
    }
  }

  return { list, detail }
}

function toLabSummary(lab: ApiLab): LabSummary {
  return {
    id: lab.id,
    slug: lab.slug,
    title: lab.title,
    subtitle: lab.subtitle,
    summary: lab.summary,
    status: DEFAULT_LAB_STATUS,
    featured: lab.featured,
    year: lab.publishedAt ? lab.publishedAt.slice(0, 4) : undefined,
    cover: toMediaRef(lab.cover),
    categories: lab.categories ?? [],
    technologies: lab.tags ?? [],
    publishedAt: lab.publishedAt ?? undefined,
    githubUrl: lab.githubUrl,
    demoUrl: lab.demoUrl,
    projectUrl: lab.projectUrl,
  }
}
