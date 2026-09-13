<script setup lang="ts">
const { message, hint, retryLabel } = defineProps<{
  message: string
  hint?: string
  retryLabel?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <!-- role="alert"：错误必须被立即朗读；重试是唯一动作，且可键盘触发。 -->
  <div class="border-t border-line py-10" role="alert">
    <p class="type-body text-ink">{{ message }}</p>
    <p v-if="hint" class="type-small mt-2 text-ink-secondary">{{ hint }}</p>
    <AppButton
      v-if="retryLabel"
      class="mt-5"
      variant="secondary"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </AppButton>
  </div>
</template>
