<script setup lang="ts">
import type { ExperienceSummary } from '~/types/experience'
import { formatYearMonth } from '~/utils/date-display'
import { isPublicEmploymentTypeVisible } from '~/utils/experience-display'

const { entry, index } = defineProps<{
  entry: ExperienceSummary
  /** 1-based 序号，用于时间线编号 */
  index?: number
}>()

const { t, te } = useI18n()

const displayIndex = computed(() =>
  typeof index === 'number' ? String(index).padStart(2, '0') : null,
)

/** 展示为 `YYYY.MM — YYYY.MM`；当前经历为 `YYYY.MM — 至今 / PRESENT` */
const period = computed(() => {
  const start = formatYearMonth(entry.startDate)
  const end = entry.current ? t('common.present') : formatYearMonth(entry.endDate)
  const range = [start, end].filter(Boolean).join(' — ')

  return range.length > 0 ? range : null
})

/**
 * employmentType 在数据库里是枚举值（FULL_TIME 等）。
 * Public 页面通过 i18n 映射为可读文案；`OTHER`（学历等）与没有映射的取值都不展示，
 * 避免把数据库枚举泄露给访客。
 */
const employmentTypeLabel = computed(() => {
  const value = entry.employmentType

  if (!isPublicEmploymentTypeVisible(value)) {
    return null
  }

  const key = `experience.employmentTypes.${value}`

  return te(key) ? t(key) : null
})

const organizationLine = computed(() => {
  const parts = [entry.organization, employmentTypeLabel.value, entry.location].filter(
    (part): part is string => Boolean(part),
  )

  // 「独立开发 / 自由职业」这类条目：组织名与 employmentType 文案相同，去重后只显示一次
  return parts.filter((part, index) => parts.indexOf(part) === index).join(' · ')
})
</script>

<template>
  <article
    v-reveal="{ delay: Math.min(((index ?? 1) - 1) * 60, 180) }"
    class="group border-t border-line py-7 desktop:py-9"
  >
    <div class="grid gap-3 desktop:grid-cols-12 desktop:gap-6">
      <p v-if="period" class="type-meta text-ink-muted desktop:col-span-2">{{ period }}</p>

      <div class="flex flex-col gap-2 desktop:col-span-10">
        <div class="flex flex-wrap items-center gap-3">
          <p v-if="displayIndex" class="type-meta text-ink-muted">{{ displayIndex }}</p>
          <h3 class="type-h3">{{ entry.title }}</h3>
        </div>

        <p v-if="organizationLine" class="type-meta text-ink-muted">{{ organizationLine }}</p>

        <p class="type-body type-body-secondary">{{ entry.summary }}</p>

        <ul v-if="entry.technologies.length > 0" class="flex flex-wrap gap-2">
          <li v-for="technology in entry.technologies" :key="technology">
            <AppBadge tone="muted" uppercase>{{ technology }}</AppBadge>
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>
