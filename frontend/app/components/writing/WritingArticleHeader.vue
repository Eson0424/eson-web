<script setup lang="ts">
import type { WritingDetail } from '~/types/writing'

const { article } = defineProps<{
  article: WritingDetail
}>()

const { locale, t } = useI18n()

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
    month: 'long',
    year: 'numeric',
  }).format(date)
})

const metaLine = computed(() =>
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
  <header class="border-b border-line">
    <AppContainer width="page">
      <div class="flex flex-col gap-8 pt-28 pb-14 desktop:pt-36 desktop:pb-16">
        <AppLink :to="'/writing'" class="type-meta w-fit text-ink-secondary">
          ← {{ t('writing.backToWriting') }}
        </AppLink>

        <div class="flex max-w-reading flex-col gap-5">
          <p class="type-meta text-ink-secondary">{{ metaLine }}</p>

          <h1 class="type-h1">{{ article.title }}</h1>

          <p v-if="article.subtitle" class="type-h3 text-ink-secondary">
            {{ article.subtitle }}
          </p>

          <p class="type-body type-body-secondary">{{ article.excerpt }}</p>
        </div>

        <ul v-if="article.tags.length > 0" class="flex flex-wrap gap-2">
          <li v-for="tag in article.tags" :key="tag">
            <AppBadge tone="outline" uppercase>{{ tag }}</AppBadge>
          </li>
        </ul>
      </div>
    </AppContainer>
  </header>
</template>
