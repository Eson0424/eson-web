<script setup lang="ts">
import type { MediaRef } from '~/types/content'
import { toCoverImage } from '~/utils/cover'
import { useImageFallback } from '~/composables/useImageFallback'

/**
 * Public Cover 渲染（Phase 4-F.5.1）。
 *
 * 只负责「封面图」这一件事：src / alt / width / height / ratio / loading / 失败兜底。
 * 不请求 API、不碰 CMS 状态、不涉及 gallery（Gallery 属于 Phase 4-F.6）。
 *
 * 三种状态：
 * - 有封面 → 真实图片（AppImage）
 * - 无封面 / 地址为空 → branded fallback（PlaceholderVisual）
 * - 加载失败 → 同一个 fallback（不会无限重试）
 */
const {
  cover = null,
  altFallback = null,
  placeholderLabel = null,
  ratio = '16 / 10',
  seed = 0,
  loading = 'lazy',
  fetchPriority,
} = defineProps<{
  cover?: MediaRef | null
  /** media.alt 为空时使用的替代文本（通常是内容标题） */
  altFallback?: string | null
  /** 无封面时占位视觉的无障碍标签；缺省沿用 altFallback */
  placeholderLabel?: string | null
  /** 例如 '16 / 10'；同时用于图片与占位视觉，避免 CLS */
  ratio?: string
  /** 占位视觉的确定性构图种子 */
  seed?: number
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
}>()

const runtimeConfig = useRuntimeConfig()

const image = computed(() =>
  toCoverImage(cover, {
    apiBase: runtimeConfig.public.apiBase,
    altFallback,
  }),
)

// 失败兜底逻辑与 Gallery 共用（含 SSR 早于 hydration 失败的场景）。
const { root, failed, markFailed } = useImageFallback(() => image.value?.src)
</script>

<template>
  <div ref="root" class="overflow-hidden rounded-md">
    <AppImage
      v-if="image && !failed"
      :alt="image.alt"
      :fetch-priority="fetchPriority"
      :height="image.height"
      :loading="loading"
      :ratio="ratio"
      :src="image.src"
      :width="image.width"
      @error="markFailed"
    />
    <PlaceholderVisual
      v-else
      :label="placeholderLabel || altFallback || ''"
      :ratio="ratio"
      :seed="seed"
    />
  </div>
</template>
