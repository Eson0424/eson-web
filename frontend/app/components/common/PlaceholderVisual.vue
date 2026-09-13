<script setup lang="ts">
const {
  seed = 0,
  ratio = '16 / 10',
  label,
} = defineProps<{
  /** 用确定性数值生成不同的构图，避免同一页出现完全相同的占位图 */
  seed?: number
  ratio?: string
  /** 无障碍标签；占位图不是装饰元素时仍需说明 */
  label: string
}>()

// 真实素材接入前不使用假截图，只用抽象图层表达视觉位置与比例。
const backdrop = computed(() => {
  const x = 18 + (seed % 3) * 24
  const y = 26 + (seed % 5) * 12
  const angle = 118 + (seed % 4) * 24

  return `radial-gradient(120% 100% at ${x}% ${y}%, rgb(61 107 255 / 18%), transparent 62%), linear-gradient(${angle}deg, #0b0d12, #10131a)`
})
</script>

<template>
  <div
    :aria-label="label"
    :style="{ aspectRatio: ratio }"
    class="relative overflow-hidden rounded-md border border-line"
    role="img"
  >
    <div :style="{ backgroundImage: backdrop }" aria-hidden="true" class="absolute inset-0" />
    <div aria-hidden="true" class="placeholder-grid absolute inset-0" />
    <div aria-hidden="true" class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />
    <slot />
  </div>
</template>

<style scoped>
.placeholder-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 5%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 5%) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(120% 90% at 50% 40%, black, transparent 78%);
}
</style>
