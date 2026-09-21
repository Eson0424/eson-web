import type { ExperienceSummary } from '../types/experience'
import type { ContentStatus } from './useWorkContent'

/**
 * Experience 列表数据入口（真实 API，GET /api/v1/experience）。
 *
 * 三种状态：pending / error / empty / success（空列表走 empty，不显示占位条目）。
 */
export function useExperienceList() {
  const { locale } = useI18n()
  const service = useExperienceService()

  const { data, status: dataStatus, error, refresh } = useAsyncData(
    'experience-list',
    () => service.list(locale.value),
    { watch: [locale], default: () => ({ items: [] as ExperienceSummary[] }) },
  )

  const items = computed<ExperienceSummary[]>(() => data.value?.items ?? [])

  const status = computed<ContentStatus>(() => {
    if (dataStatus.value === 'pending') return 'pending'
    if (dataStatus.value === 'error') return 'error'
    if (items.value.length === 0) {
      return 'empty'
    }

    return 'success'
  })

  return { items, status, error, refresh }
}

/**
 * 预留：/experience/:slug 尚未在本阶段实现，详情读取先保持与 Work / Lab 一致的接缝。
 */
