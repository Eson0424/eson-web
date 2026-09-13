import type { ExperienceSummary } from '../types/experience'
import type { ContentStatus } from './useWorkContent'

/**
 * 'placeholder'：当前列表全部是占位条目（本阶段状态）
 * 'success'：至少存在一条真实经历
 * 'empty'：没有任何条目
 */
/**
 * Experience 列表数据入口（Phase 3：真实 API，GET /api/v1/experience）。
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

  const hasPlaceholderOnly = computed(() =>
    items.value.length > 0 && items.value.every((entry) => entry.placeholder),
  )

  return { items, status, hasPlaceholderOnly, error, refresh }
}

/**
 * 预留：/experience/:slug 尚未在本阶段实现，详情读取先保持与 Work / Lab 一致的接缝。
 */
