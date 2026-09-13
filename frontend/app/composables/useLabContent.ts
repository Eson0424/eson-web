import type { LabDetail, LabSummary } from '../types/lab'
import { resolveErrorStatus } from './useWorkContent'
import type { ContentStatus } from './useWorkContent'

/**
 * Lab 列表数据入口（Phase 3：真实 API，GET /api/v1/lab）。
 */
export function useLabList() {
  const { locale } = useI18n()
  const service = useLabService()

  const { data, status: dataStatus, error, refresh } = useAsyncData(
    'lab-list',
    () => service.list(locale.value),
    { watch: [locale], default: () => ({ items: [] as LabSummary[] }) },
  )

  const items = computed<LabSummary[]>(() => data.value?.items ?? [])
  const featured = computed(() => items.value.filter((item) => item.featured))
  const remaining = computed(() => items.value.filter((item) => !item.featured))
  const status = computed<ContentStatus>(() => {
    if (dataStatus.value === 'pending') return 'pending'
    if (dataStatus.value === 'error') return 'error'

    return items.value.length > 0 ? 'success' : 'empty'
  })

  return { items, featured, remaining, status, error, refresh }
}

/**
 * Lab 详情数据入口（Phase 3：真实 API，GET /api/v1/lab/:slug）。
 */
export function useLabDetail(slug: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  const service = useLabService()

  const asyncData = useAsyncData(
    'lab-detail',
    () => service.detail(toValue(slug), locale.value),
    { watch: [() => toValue(slug), locale] },
  )
  const { data, error } = asyncData

  const notFound = computed(() => resolveErrorStatus(error.value) === 404)

  return Object.assign(asyncData, {
    experiment: data as Ref<LabDetail | null>,
    notFound,
  })
}
