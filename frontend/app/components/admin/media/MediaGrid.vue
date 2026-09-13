<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'

const { items, disabled = false } = defineProps<{
  items: AdminMediaItem[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  edit: [item: AdminMediaItem]
  remove: [item: AdminMediaItem]
}>()
</script>

<template>
  <ul class="grid list-none gap-5 tablet:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4">
    <li v-for="item in items" :key="item.id">
      <MediaCard :disabled="disabled" :item="item" @edit="emit('edit', $event)" @remove="emit('remove', $event)" />
    </li>
  </ul>
</template>
