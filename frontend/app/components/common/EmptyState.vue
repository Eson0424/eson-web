<script setup lang="ts">
const { message, hint } = defineProps<{
  message: string
  hint?: string
}>()
</script>

<template>
  <div class="border-t border-line py-10">
    <p class="type-body text-ink-secondary">{{ message }}</p>
    <p v-if="hint" class="type-small mt-2 text-ink-muted">{{ hint }}</p>
  </div>
</template>
