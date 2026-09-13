<script setup lang="ts">
import type { ExperienceSummary } from '~/types/experience'

const { entry, index } = defineProps<{
  entry: ExperienceSummary
  /** 1-based 序号，用于时间线编号 */
  index?: number
}>()

const { t } = useI18n()

const displayIndex = computed(() =>
  typeof index === 'number' ? String(index).padStart(2, '0') : null,
)

const period = computed(() => {
  const end = entry.current ? t('common.present') : entry.endDate
  const range = [entry.startDate, end].filter(Boolean).join(' — ')

  return range.length > 0 ? range : null
})

const organizationLine = computed(() =>
  [entry.organization, entry.employmentType, entry.location].filter(Boolean).join(' · '),
)
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
          <AppBadge v-if="entry.placeholder" tone="outline" uppercase>
            {{ t('experience.placeholderBadge') }}
          </AppBadge>
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
