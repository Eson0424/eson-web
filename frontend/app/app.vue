<script setup lang="ts">
const { locale } = useI18n()

// <html lang> 随当前语言变化（无障碍与 SEO 必需）。
useHead({
  htmlAttrs: {
    lang: () => locale.value,
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
