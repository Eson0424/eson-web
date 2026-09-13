<script setup lang="ts">
import type { MediaRef } from '~/types/content'
import { toCoverImage } from '~/utils/cover'
import { toGalleryImageLayout } from '~/utils/gallery'
import { useImageFallback } from '~/composables/useImageFallback'

/**
 * Public Gallery 单张图片（Phase 4-F.6.2）。
 *
 * 与 PublicCover 的区别：Gallery 使用图片**固有比例**，绝不裁切（禁止 object-cover）；
 * 缺少 width/height 时退回稳定容器比例 + object-contain，避免 CLS 与变形。
 * 失败兜底与 Cover 共用同一套机制（useImageFallback），单张失败只影响该张。
 */
const {
  media = null,
  altFallback = null,
  placeholderLabel = null,
  seed = 0,
} = defineProps<{
  media?: MediaRef | null
  /** media.alt 为空时使用的替代文本（通常是内容标题） */
  altFallback?: string | null
  /** 无图片 / 加载失败时占位视觉的无障碍标签 */
  placeholderLabel?: string | null
  seed?: number
}>()

const runtimeConfig = useRuntimeConfig()

const image = computed(() =>
  toCoverImage(media, {
    apiBase: runtimeConfig.public.apiBase,
    altFallback,
  }),
)
const layout = computed(() => toGalleryImageLayout(media))
const { root, failed, markFailed } = useImageFallback(() => image.value?.src)
</script>

<template>
  <div ref="root" class="overflow-hidden rounded-md">
    <!-- lazy + async decoding：Gallery 不参与首屏 LCP，也没有 fetchpriority -->
    <AppImage
      v-if="image && !failed"
      :alt="image.alt"
      :fit="layout.fit"
      :height="image.height"
      loading="lazy"
      :ratio="layout.ratio ?? undefined"
      :src="image.src"
      :width="image.width"
      @error="markFailed"
    />
    <PlaceholderVisual
      v-else
      :label="placeholderLabel || altFallback || ''"
      ratio="16 / 10"
      :seed="seed"
    />
  </div>
</template>
