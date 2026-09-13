import { HOME_CONTENT } from '../data/home'
import { DEFAULT_LOCALE, type AppLocale } from '../types/locale'
import type { HomeContent } from '../types/content'

/**
 * 首页内容入口（Phase 2B）。
 *
 * 当前返回静态占位内容；接入真实 API 时替换此处的数据来源即可，
 * Section / Component 层不需要改动（docs/API.md、AGENTS §11）。
 * 语言缺失时回退 zh-CN（AGENTS §9）。
 */
export function useHomeContent() {
  const { locale } = useI18n()

  const content = computed<HomeContent>(() => {
    const current = locale.value as AppLocale

    return HOME_CONTENT[current] ?? HOME_CONTENT[DEFAULT_LOCALE]
  })

  return { content }
}

/** 首页内容区块的展示条数（PRD §9：精选 3 条、其余 3 条） */
const HOME_SECTION_LIMIT = 3

/**
 * 首页内容区块状态：文案（标题/lede/编号）来自本地编辑内容，
 * 条目来自真实 API（work / lab / writing / experience composables）。
 */
export function useHomeSections() {
  const { content } = useHomeContent()
  const work = useWorkList()
  const lab = useLabList()
  const writing = useWritingList()
  const experience = useExperienceList()

  const workItems = computed(() => pickHighlighted(work.items.value, work.featured.value))
  const labItems = computed(() => pickHighlighted(lab.items.value, lab.featured.value))
  const writingItems = computed(() => pickHighlighted(writing.items.value, writing.featured.value))
  const experienceItems = computed(() => experience.items.value.slice(0, HOME_SECTION_LIMIT))

  return {
    selectedWork: computed(() => ({ ...content.value.selectedWork, items: workItems.value })),
    capabilities: computed(() => content.value.capabilities),
    lab: computed(() => ({ ...content.value.lab, items: labItems.value })),
    writing: computed(() => ({ ...content.value.writing, items: writingItems.value })),
    experience: computed(() => ({ ...content.value.experience, items: experienceItems.value })),
    workStatus: work.status,
    labStatus: lab.status,
    writingStatus: writing.status,
    experienceStatus: experience.status,
    retryWork: work.refresh,
    retryLab: lab.refresh,
    retryWriting: writing.refresh,
    retryExperience: experience.refresh,
  }
}

/** 精选优先，不足则用剩余内容补齐（不改动 API 排序） */
function pickHighlighted<TItem>(items: TItem[], featured: TItem[]): TItem[] {
  const ordered = [...featured, ...items.filter((item) => !featured.includes(item))]

  return ordered.slice(0, HOME_SECTION_LIMIT)
}
