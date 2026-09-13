import type { WritingDetail, WritingSummary } from '~/types/writing'
import { toWritingBlocks } from '~/utils/content'
import { useApiClient } from './api'
import { toMediaRef } from './work.service'

interface ApiWriting {
  id: string
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  content?: string | null
  featured: boolean
  readingTime: number | null
  cover?: { url: string; alt: string; width?: number; height?: number }
  categories: string[]
  tags: string[]
  publishedAt?: string | null
}

export function useWritingService() {
  const { request } = useApiClient()

  async function list(locale: string, query: Record<string, unknown> = {}) {
    const response = await request<{ data: ApiWriting[]; meta: unknown } | ApiWriting[]>('/writing', {
      query: { locale, pageSize: 100, ...query },
    })
    const items = Array.isArray(response) ? response : response.data

    return { items: items.map(toWritingSummary) }
  }

  async function detail(slug: string, locale: string): Promise<WritingDetail> {
    const article = await request<ApiWriting>(`/writing/${slug}`, { query: { locale } })

    return {
      ...toWritingSummary(article),
      content: toWritingBlocks(article.content),
      seoTitle: article.title,
      seoDescription: article.excerpt,
    }
  }

  return { list, detail }
}

function toWritingSummary(article: ApiWriting): WritingSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    categories: article.categories ?? [],
    tags: article.tags ?? [],
    publishedAt: article.publishedAt ? article.publishedAt.slice(0, 10) : undefined,
    readingTimeMinutes: article.readingTime ?? 1,
    featured: article.featured,
    cover: toMediaRef(article.cover),
  }
}
