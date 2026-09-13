<script setup lang="ts">
import type { WritingSummary } from '~/types/writing'

const { tags, related, previous, next } = defineProps<{
  tags: string[]
  related: WritingSummary[]
  previous: WritingSummary | null
  next: WritingSummary | null
}>()

const { t } = useI18n()
</script>

<template>
  <footer class="flex flex-col gap-12 border-t border-line pt-12">
    <div v-if="tags.length > 0" class="flex flex-col gap-4">
      <p class="type-meta text-ink-muted">{{ t('writing.tagsLabel') }}</p>
      <ul class="flex flex-wrap gap-2">
        <li v-for="tag in tags" :key="tag">
          <AppBadge tone="outline" uppercase>{{ tag }}</AppBadge>
        </li>
      </ul>
    </div>

    <nav
      v-if="previous || next"
      :aria-label="t('writing.articleNavigationLabel')"
      class="flex flex-col gap-4"
    >
      <div class="grid gap-6 tablet:grid-cols-2">
        <div v-if="previous" class="flex flex-col gap-2">
          <p class="type-meta text-ink-muted">← {{ t('writing.previousArticle') }}</p>
          <AppLink :to="`/writing/${previous.slug}`" class="type-small">
            {{ previous.title }}
          </AppLink>
        </div>
        <div v-if="next" class="flex flex-col gap-2 tablet:items-end tablet:text-right">
          <p class="type-meta text-ink-muted">{{ t('writing.nextArticle') }} →</p>
          <AppLink :to="`/writing/${next.slug}`" class="type-small">
            {{ next.title }}
          </AppLink>
        </div>
      </div>
    </nav>

    <div v-if="related.length > 0" class="flex flex-col gap-6">
      <h2 class="type-h3">{{ t('writing.relatedWriting') }}</h2>
      <div class="flex flex-col">
        <WritingItem
          v-for="(article, index) in related"
          :key="article.id"
          :article="article"
          :index="index + 1"
          variant="compact"
        />
      </div>
    </div>
  </footer>
</template>
