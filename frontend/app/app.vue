<script setup lang="ts">
const { locale } = useI18n()
const runtimeConfig = useRuntimeConfig()

/**
 * 默认社交分享图：站点级兜底，保证任何页面都有 og:image。
 *
 * 使用 `key` 与详情页的 cover 图共享同一个去重键，因此详情页存在真实封面时
 * 会覆盖这里的默认图，不存在时自动回退到这里（不会出现两个 og:image）。
 */
const defaultOgImage = computed(() =>
  new URL(runtimeConfig.public.defaultOgImage, runtimeConfig.public.siteUrl).toString(),
)

// <html lang> 随当前语言变化（无障碍与 SEO 必需）。
useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
  },
  meta: [
    { key: 'og:image', property: 'og:image', content: defaultOgImage.value },
    { key: 'twitter:image', name: 'twitter:image', content: defaultOgImage.value },
  ],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
