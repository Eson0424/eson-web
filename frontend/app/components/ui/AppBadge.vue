<script setup lang="ts">
const {
  tone = 'neutral',
  size = 'sm',
  uppercase = false,
} = defineProps<{
  tone?: 'neutral' | 'accent' | 'muted' | 'outline'
  size?: 'sm' | 'md'
  /** 分类、标签等技术性文本可使用大写 + 字距（DESIGN §6） */
  uppercase?: boolean
}>()

const TONE_CLASSES = {
  neutral: 'border-line bg-surface text-ink-secondary',
  accent: 'border-transparent bg-accent-soft text-accent-text',
  muted: 'border-transparent bg-transparent text-ink-muted',
  outline: 'border-line-strong bg-transparent text-ink',
} as const

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-meta',
  md: 'px-2.5 py-1 text-small',
} as const

const badgeClasses = computed(() =>
  cn(
    'inline-flex items-center gap-1.5 rounded-sm border leading-none',
    TONE_CLASSES[tone],
    SIZE_CLASSES[size],
    uppercase && 'uppercase tracking-[0.08em]',
  ),
)
</script>

<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>
