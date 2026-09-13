<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import type { MediaPickerMode } from '~/composables/useAdminMediaPicker'
import { formatDimensions, mediaDisplayName } from '~/utils/media'

const { item, mode, selected } = defineProps<{
  item: AdminMediaItem
  mode: MediaPickerMode
  selected: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const { t } = useI18n()

const previewFailed = ref(false)
const name = computed(() => mediaDisplayName(item))
</script>

<template>
  <label
    class="flex cursor-pointer flex-col gap-3 rounded-md border p-3 transition-colors duration-[var(--duration-ui)]"
    :class="selected ? 'border-accent-strong bg-accent-strong/10' : 'border-line bg-surface/40'"
  >
    <span class="flex items-start gap-3">
      <!-- 原生 radio / checkbox：键盘与读屏语义免费获得；视觉选中态同时反映在容器边框上 -->
      <input
        :aria-label="t('admin.media.picker.selectAria', { name })"
        :checked="selected"
        class="mt-0.5 size-4 shrink-0 accent-accent-strong"
        :name="mode === 'single' ? 'media-picker-single' : undefined"
        :type="mode === 'single' ? 'radio' : 'checkbox'"
        @change="emit('toggle', item.id)"
      >
      <span class="type-small break-all text-ink">{{ name }}</span>
    </span>

    <span
      class="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-sm border border-line bg-background-secondary"
    >
      <img
        v-if="!previewFailed"
        :alt="item.alt || name"
        class="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        :src="item.url"
        @error="previewFailed = true"
      >
      <span v-else class="type-meta px-3 text-center text-ink-muted">
        {{ t('admin.media.previewUnavailable') }}
      </span>
    </span>

    <span class="type-meta text-ink-muted">{{ formatDimensions(item.width, item.height) }}</span>
  </label>
</template>
