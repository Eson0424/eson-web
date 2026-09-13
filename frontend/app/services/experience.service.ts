import type { ExperienceSummary } from '~/types/experience'
import { useApiClient } from './api'

interface ApiExperience {
  id: string
  role: string
  company?: string
  employmentType?: string
  location?: string
  startDate?: string | null
  endDate?: string | null
  isCurrent: boolean
  summary: string
}

export function useExperienceService() {
  const { request } = useApiClient()

  async function list(locale: string) {
    const response = await request<ApiExperience[] | { data: ApiExperience[] }>('/experience', {
      query: { locale, pageSize: 100 },
    })
    const items = Array.isArray(response) ? response : response.data

    return {
      items: items.map<ExperienceSummary>((entry) => ({
        // Experience 表没有 slug 列（DATABASE §20），用 id 作为稳定 key
        id: entry.id,
        slug: entry.id,
        title: entry.role,
        organization: entry.company,
        location: entry.location,
        employmentType: entry.employmentType,
        startDate: entry.startDate ?? undefined,
        endDate: entry.endDate ?? null,
        current: entry.isCurrent,
        summary: entry.summary,
        technologies: [],
        // API 未返回公司/时间时视为占位条目（Phase 2C-3 的占位策略）
        placeholder: !entry.company,
      })),
    }
  }

  return { list }
}
