<script setup lang="ts">
import type { ExperienceSummary } from '~/types/experience'

const { items } = defineProps<{
  items: ExperienceSummary[]
}>()
</script>

<template>
  <div class="flex flex-col gap-8">
    <ol class="flex flex-col">
      <li v-for="(entry, index) in items" :key="entry.id">
        <ExperienceItem :entry="entry" :index="index + 1" />
      </li>
    </ol>
  </div>
</template>
