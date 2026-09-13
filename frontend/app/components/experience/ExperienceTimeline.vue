<script setup lang="ts">
import type { ExperienceSummary } from '~/types/experience'

const { items, placeholder = false } = defineProps<{
  items: ExperienceSummary[]
  /** 全部条目都是占位数据时，页面必须明确说明 */
  placeholder?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-8">
    <p
      v-if="placeholder"
      class="type-small type-reading-width rounded-md border border-line bg-surface/40 p-5 text-ink-secondary"
    >
      <span aria-hidden="true" class="mr-2 text-ink-muted">▲</span>
      {{ t('experience.placeholderNotice') }}
    </p>

    <ol class="flex flex-col">
      <li v-for="(entry, index) in items" :key="entry.id">
        <ExperienceItem :entry="entry" :index="index + 1" />
      </li>
    </ol>
  </div>
</template>
