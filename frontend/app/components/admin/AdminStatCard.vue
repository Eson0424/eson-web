<script setup lang="ts">
const { label, value, hint } = defineProps<{
  label: string
  value: number
  hint?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-md border border-line bg-surface/60 p-6">
    <p class="type-meta text-ink-muted">{{ label }}</p>
    <p class="text-h3 font-semibold text-ink">{{ value }}</p>
    <p v-if="hint" class="type-meta text-ink-muted">{{ hint }}</p>
  </div>
</template>
