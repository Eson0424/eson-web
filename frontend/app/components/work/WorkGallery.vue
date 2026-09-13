<script setup lang="ts">
import type { WorkGalleryItem } from '~/types/work'
import { toGalleryRows } from '~/utils/gallery'

const { items, title = '' } = defineProps<{
  items: WorkGalleryItem[]
  /** 内容标题：media.alt 缺失时作为替代文本 / 占位标签 */
  title?: string
}>()

const { t } = useI18n()

// 只做 caption 归一化；顺序完全沿用 API（不排序 / 不反转 / 不去重）
const rows = computed(() => toGalleryRows(items))
</script>

<template>
  <AppSection id="gallery" labelled-by="gallery-heading" spacing="sm">
    <div class="flex flex-col gap-8">
      <AppSectionHeader id="gallery-heading" :title="t('work.gallery')" />

      <ul class="grid gap-8 tablet:grid-cols-2">
        <li
          v-for="(row, index) in rows"
          :key="row.id"
          v-reveal="{ delay: index * 70 }"
          class="flex flex-col gap-3"
        >
          <PublicGalleryImage
            :alt-fallback="title"
            :media="row.media"
            :placeholder-label="row.caption || t('common.visualPlaceholder', { title })"
            :seed="index + 2"
          />
          <p v-if="row.caption" class="type-small text-ink-muted">{{ row.caption }}</p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
