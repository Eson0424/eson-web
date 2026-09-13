<script setup lang="ts">
const { t } = useI18n()
const { content } = useAboutContent()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('about.pageTitle')} — ESON`)
const pageDescription = computed(() => content.value.hero.lead)
const canonicalUrl = computed(() => new URL('/about', runtimeConfig.public.siteUrl).toString())

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => pageDescription.value,
})

useHead({
  link: [{ href: canonicalUrl, rel: 'canonical' }],
})
</script>

<template>
  <div>
    <AboutHero :hero="content.hero" />
    <AboutProfile :profile="content.profile" />
    <AboutPhilosophy :philosophy="content.philosophy" />
    <AboutCapabilities :capabilities="content.capabilities" />
    <AboutFocus :focus="content.focus" />
    <AboutCta :cta="content.cta" />
  </div>
</template>
