<script setup lang="ts">
const { message, hint } = defineProps<{
  message: string
  hint?: string
}>()
</script>

<template>
  <!-- role="status" + polite：加载状态对屏幕阅读器可见，但不会打断当前朗读。 -->
  <div aria-live="polite" class="border-t border-line py-10" role="status">
    <p class="type-body text-ink-secondary">{{ message }}</p>
    <p v-if="hint" class="type-small mt-2 text-ink-muted">{{ hint }}</p>
  </div>
</template>
