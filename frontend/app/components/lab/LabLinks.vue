<script setup lang="ts">
import type { LabLink } from '~/types/lab'

const { links } = defineProps<{
  links: LabLink[]
}>()
</script>

<template>
  <ul class="flex flex-wrap items-center gap-x-8 gap-y-3">
    <li v-for="link in links" :key="link.href">
      <AppLink :href="link.href" arrow class="type-small" external>
        {{ link.label }}
      </AppLink>
    </li>
  </ul>
</template>
