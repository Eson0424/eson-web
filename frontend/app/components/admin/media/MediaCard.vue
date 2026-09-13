<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import { formatDimensions, formatFileSize, formatMediaDate, mediaDisplayName } from '~/utils/media'

const { item, disabled = false } = defineProps<{
  item: AdminMediaItem
  disabled?: boolean
}>()

const emit = defineEmits<{
  edit: [item: AdminMediaItem]
  remove: [item: AdminMediaItem]
}>()

const { t } = useI18n()

const previewFailed = ref(false)
const name = computed(() => mediaDisplayName(item))
</script>

<template>
  <article class="flex flex-col gap-4 rounded-md border border-line bg-surface/40 p-4">
    <div
      class="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-sm border border-line bg-background-secondary"
    >
      <img
        v-if="!previewFailed"
        :alt="item.alt || name"
        :src="item.url"
        class="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        @error="previewFailed = true"
      >
      <p v-else class="type-meta px-4 text-center text-ink-muted">
        {{ t('admin.media.previewUnavailable') }}
      </p>
    </div>

    <div class="flex flex-col gap-1">
      <p class="type-small break-all text-ink">{{ name }}</p>
      <p class="type-meta text-ink-muted">
        {{ formatDimensions(item.width, item.height) }} · {{ formatFileSize(item.size) }} ·
        {{ item.mimeType }}
      </p>
      <p class="type-meta text-ink-muted">
        {{ t('admin.media.labels.createdAt') }}: {{ formatMediaDate(item.createdAt) }}
      </p>
      <p class="type-small break-words text-ink-secondary">
        {{ item.alt || t('admin.media.noAlt') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <AppButton
        size="sm"
        variant="secondary"
        :aria-label="t('admin.media.editAria', { name })"
        :disabled="disabled"
        @click="emit('edit', item)"
      >
        {{ t('admin.media.editAction') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="ghost"
        :aria-label="t('admin.media.deleteAria', { name })"
        :disabled="disabled"
        @click="emit('remove', item)"
      >
        {{ t('admin.media.deleteAction') }}
      </AppButton>
    </div>
  </article>
</template>
