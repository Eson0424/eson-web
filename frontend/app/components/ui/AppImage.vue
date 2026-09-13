<script setup lang="ts">
const {
  src,
  alt,
  width,
  height,
  ratio,
  sizes,
  loading = 'lazy',
  fetchPriority,
  caption,
  rounded = false,
  fit = 'cover',
} = defineProps<{
  src: string
  /** 装饰性图片传空字符串；有意义的图片必须提供描述 */
  alt: string
  width?: number
  height?: number
  /** 例如 '16 / 9'，用于在没有固有尺寸时避免 CLS */
  ratio?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  caption?: string
  rounded?: boolean
  /**
   * object-fit 策略：cover（默认，用于固定比例的封面 / 占位场景）；
   * contain / none 用于 Gallery —— 真实图片按固有比例展示，绝不裁切（Phase 4-F.6.2）。
   */
  fit?: 'cover' | 'contain' | 'none'
}>()

const imageStyle = computed(() => (ratio ? { aspectRatio: ratio } : undefined))

// error 事件不会冒泡，无法靠属性透传拿到：由 <img> 显式转发给调用方（用于封面兜底）。
const emit = defineEmits<{
  error: []
}>()
</script>

<template>
  <figure class="flex flex-col gap-3">
    <img
      :alt="alt"
      :class="cn(
        'h-auto w-full',
        fit === 'cover' && 'object-cover',
        fit === 'contain' && 'object-contain',
        rounded && 'rounded-md',
      )"
      :decoding="loading === 'eager' ? 'sync' : 'async'"
      :fetchpriority="fetchPriority"
      :height="height"
      :loading="loading"
      :sizes="sizes"
      :src="src"
      :style="imageStyle"
      :width="width"
      @error="emit('error')"
    >
    <figcaption v-if="caption" class="type-small text-ink-muted">
      {{ caption }}
    </figcaption>
  </figure>
</template>
