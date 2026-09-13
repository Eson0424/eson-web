<script setup lang="ts">
import type { LabGalleryItem } from '~/types/lab'
import { toGalleryRows } from '~/utils/gallery'

const { items, title = '' } = defineProps<{
  items: LabGalleryItem[]
  /** 内容标题：media.alt 缺失时作为替代文本 / 占位标签 */
  title?: string
}>()

const { t } = useI18n()

// 只做 caption 归一化；顺序完全沿用 API（不排序 / 不反转 / 不去重）
const rows = computed(() => toGalleryRows(items))
</script>

<template>
  <AppSection id="gallery" labelled-by="lab-gallery-heading" spacing="sm">
    <div class="flex flex-col gap-8">
      <AppSectionHeader id="lab-gallery-heading" :title="t('lab.gallery')" />

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
            :seed="index + 5"
          />
          <p v-if="row.caption" class="type-small text-ink-muted">{{ row.caption }}</p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
