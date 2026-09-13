import type { WritingDetail, WritingSummary } from '../types/writing'
import { resolveErrorStatus } from './useWorkContent'
import type { ContentStatus } from './useWorkContent'

/**
 * Writing 列表数据入口（Phase 3：真实 API，默认 publishedAt DESC）。
 */
export function useWritingList() {
  const { locale } = useI18n()
  const service = useWritingService()

  const { data, status: dataStatus, error, refresh } = useAsyncData(
    'writing-list',
    () => service.list(locale.value),
    { watch: [locale], default: () => ({ items: [] as WritingSummary[] }) },
  )

  const items = computed<WritingSummary[]>(() => data.value?.items ?? [])
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
 * Writing 详情数据入口（Phase 3：真实 API）。
 */
export function useWritingDetail(slug: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  const service = useWritingService()

  const asyncData = useAsyncData(
    'writing-detail',
    () => service.detail(toValue(slug), locale.value),
    { watch: [() => toValue(slug), locale] },
  )
  const { data, error } = asyncData

  const notFound = computed(() => resolveErrorStatus(error.value) === 404)

  return Object.assign(asyncData, {
    article: data as Ref<WritingDetail | null>,
    notFound,
  })
}

/**
 * 文章导航：上一篇 / 下一篇 / 相关文章。
 * 相关文章优先取同分类，其次按列表顺序补齐，不重复当前文章。
 */
export function useWritingNavigation(currentSlug: MaybeRefOrGetter<string>) {
  const { items } = useWritingList()

  const index = computed(() => items.value.findIndex((item) => item.slug === toValue(currentSlug)))

  const previous = computed(() => (index.value > 0 ? (items.value[index.value - 1] ?? null) : null))

  const next = computed(() => {
    const nextItem = items.value[index.value + 1]

    return nextItem ?? null
  })

  const related = computed(() => {
    const current = items.value[index.value]

    if (!current) {
      return []
    }

    const others = items.value.filter((item) => item.slug !== current.slug)
    const sameCategory = others.filter((item) =>
      item.categories.some((category) => current.categories.includes(category)),
    )
    const rest = others.filter((item) => !sameCategory.includes(item))

    return [...sameCategory, ...rest].slice(0, relatedLimit(items.value.length))
  })

  return { previous, next, related }
}

const RELATED_MAX = 3

function relatedLimit(total: number) {
  return Math.min(RELATED_MAX, Math.max(total - 1, 0))
}
