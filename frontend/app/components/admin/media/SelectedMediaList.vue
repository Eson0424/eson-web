<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import { formatDimensions, mediaDisplayName } from '~/utils/media'
import { canMoveDown, canMoveUp } from '~/utils/media-selection'

const { rows, disabled = false } = defineProps<{
  /** 顺序 = sort_order：数组下标即展示位置 */
  rows: Array<{ id: string; item: AdminMediaItem | null }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  move: [from: number, to: number]
  remove: [id: string]
}>()

const { t } = useI18n()

function label(item: AdminMediaItem | null, id: string): string {
  return item ? mediaDisplayName(item) : id
}
</script>

<template>
  <ol class="flex list-none flex-col gap-3">
    <li
      v-for="(row, index) in rows"
      :key="row.id"
      class="flex flex-wrap items-center gap-4 rounded-sm border border-line bg-background-secondary p-3"
    >
      <span class="type-meta w-6 shrink-0 text-ink-muted">{{ index + 1 }}</span>

      <span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line">
        <img
          v-if="row.item"
          :alt="row.item.alt || label(row.item, row.id)"
          class="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          :src="row.item.url"
        >
        <span v-else aria-hidden="true" class="type-meta text-ink-muted">?</span>
      </span>

      <span class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="type-small break-all text-ink">{{ label(row.item, row.id) }}</span>
        <span v-if="row.item" class="type-meta text-ink-muted">
          {{ formatDimensions(row.item.width, row.item.height) }}
        </span>
      </span>

      <span class="flex flex-wrap items-center gap-2">
        <AppButton
          :aria-label="t('admin.media.gallery.moveUpAria', { name: label(row.item, row.id) })"
          :disabled="disabled || !canMoveUp(index)"
          size="sm"
          variant="secondary"
          @click="emit('move', index, index - 1)"
        >
          {{ t('admin.media.gallery.moveUp') }}
        </AppButton>
        <AppButton
          :aria-label="t('admin.media.gallery.moveDownAria', { name: label(row.item, row.id) })"
          :disabled="disabled || !canMoveDown(index, rows.length)"
          size="sm"
          variant="secondary"
          @click="emit('move', index, index + 1)"
        >
          {{ t('admin.media.gallery.moveDown') }}
        </AppButton>
        <AppButton
          :aria-label="t('admin.media.gallery.removeAria', { name: label(row.item, row.id) })"
          :disabled="disabled"
          size="sm"
          variant="ghost"
          @click="emit('remove', row.id)"
        >
          {{ t('admin.media.gallery.remove') }}
        </AppButton>
      </span>
    </li>
  </ol>
</template>
