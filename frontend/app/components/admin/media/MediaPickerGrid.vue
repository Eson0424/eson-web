<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import type { MediaPickerMode } from '~/composables/useAdminMediaPicker'

const { items, mode, selectedIds } = defineProps<{
  items: AdminMediaItem[]
  mode: MediaPickerMode
  selectedIds: string[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()
</script>

<template>
  <ul class="grid list-none gap-4 tablet:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4">
    <li v-for="item in items" :key="item.id">
      <MediaPickerItem
        :item="item"
        :mode="mode"
        :selected="selectedIds.includes(item.id)"
        @toggle="emit('toggle', $event)"
      />
    </li>
  </ul>
</template>
