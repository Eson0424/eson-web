<script setup lang="ts">
const {
  id,
  labelledBy,
  spacing = 'md',
  tone = 'default',
} = defineProps<{
  id?: string
  /** 指向章节标题 id，供屏幕阅读器建立章节语义 */
  labelledBy?: string
  spacing?: 'none' | 'sm' | 'md'
  tone?: 'default' | 'secondary'
}>()

const SPACING_CLASSES = {
  none: '',
  sm: 'section-space-sm',
  md: 'section-space',
} as const

const TONE_CLASSES = {
  default: '',
  secondary: 'bg-background-secondary',
} as const

const sectionClasses = computed(() => cn(SPACING_CLASSES[spacing], TONE_CLASSES[tone]))
</script>

<template>
  <section :id="id" :aria-labelledby="labelledBy" :class="sectionClasses">
    <AppContainer width="page">
      <slot />
    </AppContainer>
  </section>
</template>
