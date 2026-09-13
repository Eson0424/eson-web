<script setup lang="ts">
const { content } = useHomeContent()
const {
  selectedWork,
  capabilities,
  lab,
  writing,
  experience,
  workStatus,
  labStatus,
  writingStatus,
  experienceStatus,
  retryWork,
  retryLab,
  retryWriting,
  retryExperience,
} = useHomeSections()
const { locale } = useI18n()
const runtimeConfig = useRuntimeConfig()

const siteUrl = runtimeConfig.public.siteUrl

const pageTitle = computed(() => `${content.value.hero.brand} — ${content.value.hero.headline.join(' ')}`)
const canonicalUrl = computed(() => new URL('/', siteUrl).toString())
const openGraphLocale = computed(() => (locale.value === 'zh-CN' ? 'zh_CN' : 'en_US'))

/**
 * 只声明真实存在的信息：站点名、URL、语言。
 * 不使用 Person / Article 结构化数据，因为当前没有可核实的真实作者信息与文章日期。
 */
const websiteJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: content.value.hero.brand,
  url: canonicalUrl.value,
  inLanguage: locale.value,
}))

useSeoMeta({
  title: () => pageTitle.value,
  description: () => content.value.hero.lead,
  ogTitle: () => pageTitle.value,
  ogDescription: () => content.value.hero.lead,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  ogLocale: () => openGraphLocale.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => content.value.hero.lead,
})

useHead(() => ({
  link: [{ href: canonicalUrl.value, rel: 'canonical' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(websiteJsonLd.value),
    },
  ],
}))
</script>

<template>
  <div>
    <HomeHero :hero="content.hero" />
    <HomeIntro :intro="content.intro" />
    <HomeSelectedWork
      :section="selectedWork"
      :status="workStatus"
      @retry="retryWork()"
    />
    <HomeCapabilities :section="capabilities" />
    <HomeLab :section="lab" :status="labStatus" @retry="retryLab()" />
    <HomeWriting :section="writing" :status="writingStatus" @retry="retryWriting()" />
    <HomeExperience :section="experience" :status="experienceStatus" @retry="retryExperience()" />
    <HomeContact :contact="content.contact" />
  </div>
</template>
