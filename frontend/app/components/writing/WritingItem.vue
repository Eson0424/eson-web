<script setup lang="ts">
import type { WritingSummary } from '~/types/writing'

const { article, index, variant = 'full' } = defineProps<{
  article: WritingSummary
  index: number
  /** full：Featured / 列表主条目；compact：All writing 归档行 */
  variant?: 'full' | 'compact'
}>()

const { locale, t } = useI18n()

const displayIndex = computed(() => String(index).padStart(2, '0'))
const isCompact = computed(() => variant === 'compact')

const publishedLabel = computed(() => {
  if (!article.publishedAt) {
    return null
  }

  const date = new Date(`${article.publishedAt}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
})

const meta = computed(() =>
  [
    article.categories[0],
    publishedLabel.value,
    t('writing.readingTime', { minutes: article.readingTimeMinutes }),
  ]
    .filter(Boolean)
    .join(' · '),
)
</script>

<template>
  <article
    v-reveal="{ delay: Math.min((index - 1) * 40, 160) }"
    :class="cn('group border-t border-line', isCompact ? 'py-5 desktop:py-6' : 'py-7 desktop:py-9')"
  >
    <div class="grid gap-3 desktop:grid-cols-12 desktop:items-baseline desktop:gap-6">
      <p class="type-meta text-ink-muted desktop:col-span-1">{{ displayIndex }}</p>

      <div class="flex flex-col gap-2 desktop:col-span-7">
        <div class="flex flex-wrap items-center gap-3">
          <h3 :class="isCompact ? 'type-body font-medium' : 'type-h3'">
            <AppLink :to="`/writing/${article.slug}`" underline="collapsed">
              {{ article.title }}
            </AppLink>
          </h3>
          <AppBadge v-if="article.featured" tone="accent" uppercase>
            {{ t('writing.featured') }}
          </AppBadge>
        </div>

        <p v-if="article.subtitle && !isCompact" class="type-small text-ink-muted">
          {{ article.subtitle }}
        </p>

        <p v-if="!isCompact" class="type-small text-ink-secondary">{{ article.excerpt }}</p>

        <ul v-if="!isCompact && article.tags.length > 0" class="flex flex-wrap gap-2">
          <li v-for="tag in article.tags" :key="tag">
            <AppBadge tone="muted" uppercase>{{ tag }}</AppBadge>
          </li>
        </ul>
      </div>

      <p class="type-meta text-ink-muted desktop:col-span-4 desktop:text-right">{{ meta }}</p>
    </div>
  </article>
</template>
