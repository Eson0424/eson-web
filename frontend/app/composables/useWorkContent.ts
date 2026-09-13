import type { WorkSummary } from '../types/content'
import type { WorkDetail } from '../types/work'
/** 兼容 Nuxt 包装后的 NuxtError（statusCode）与 ApiRequestError（status） */
export function resolveErrorStatus(error: unknown): number {
  if (!error) {
    return 0
  }

  const candidate = error as { status?: number; statusCode?: number; response?: { status?: number } }

  return candidate.status ?? candidate.statusCode ?? candidate.response?.status ?? 0
}

export type ContentStatus = 'pending' | 'success' | 'empty' | 'error'

/**
 * Work 列表数据入口（Phase 3：真实 API）。
 * 数据流：Page → Composable → Service → API（AGENTS §11）。
 */
export function useWorkList() {
  const { locale } = useI18n()
  const service = useWorkService()

  const { data, status: dataStatus, error, refresh } = useAsyncData(
    'work-list',
    () => service.list(locale.value),
    { watch: [locale], default: () => ({ items: [] as WorkSummary[], meta: null }) },
  )

  const items = computed<WorkSummary[]>(() => data.value?.items ?? [])
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
 * Work 详情数据入口（Phase 3：真实 API）。
 * 404 由页面处理（未发布或不存在都返回 NOT_FOUND）。
 */
export function useWorkDetail(slug: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  const service = useWorkService()

  const asyncData = useAsyncData(
    'work-detail',
    () => service.detail(toValue(slug), locale.value),
    { watch: [() => toValue(slug), locale] },
  )
  const { data, error } = asyncData

  const notFound = computed(() => resolveErrorStatus(error.value) === 404)

  // 返回可 await 的 AsyncData 对象，页面因此可以在 SSR 阶段处理 404
  return Object.assign(asyncData, {
    work: data as Ref<WorkDetail | null>,
    notFound,
  })
}
