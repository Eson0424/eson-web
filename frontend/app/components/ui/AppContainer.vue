<script setup lang="ts">
const { as = 'div', width = 'page' } = defineProps<{
  /** 渲染的元素标签，默认 div */
  as?: string
  /** page：1440px 内容容器；reading：正文阅读宽度（650–760px） */
  width?: 'page' | 'reading' | 'full'
}>()

const WIDTH_CLASSES = {
  page: 'container-page',
  reading: 'mx-auto w-full max-w-reading px-[var(--page-padding)]',
  full: 'w-full',
} as const

const widthClass = computed(() => WIDTH_CLASSES[width])
</script>

<template>
  <component :is="as" :class="widthClass">
    <slot />
  </component>
</template>
