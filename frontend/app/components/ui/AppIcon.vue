<script setup lang="ts">
const {
  size = 'md',
  decorative = true,
  label,
} = defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 装饰性图标对辅助技术隐藏；语义图标必须提供 label */
  decorative?: boolean
  label?: string
}>()

const SIZE_CLASSES = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const

const sizeClass = computed(() => SIZE_CLASSES[size])
</script>

<template>
  <span
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : label"
    :class="cn('inline-flex shrink-0 items-center justify-center [&>svg]:size-full', sizeClass)"
    :role="decorative ? undefined : 'img'"
  >
    <slot />
  </span>
</template>
