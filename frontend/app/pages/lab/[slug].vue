<script setup lang="ts">
import type { LabLink } from '~/types/lab'
import { toCoverImage } from '~/utils/cover'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const { items } = useLabList()

const slug = computed(() => String(route.params.slug ?? ''))
const labData = useLabDetail(slug)
await labData

const { experiment, notFound } = labData

if (notFound.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('lab.notFoundTitle'),
    message: t('lab.notFoundMessage'),
    fatal: true,
  })
}

const detail = experiment.value

if (!detail) {
  throw createError({
    statusCode: 500,
    statusMessage: t('states.errorLab'),
    message: t('states.errorHint'),
    fatal: true,
  })
}

const pageTitle = computed(() => detail.seoTitle ?? `${detail.title} — ESON`)
const pageDescription = computed(() => detail.seoDescription ?? detail.summary)
const canonicalUrl = computed(
  () => new URL(`/lab/${detail.slug}`, runtimeConfig.public.siteUrl).toString(),
)

// 封面已由 Public API 随内容返回（cover.url）；这里只把它解析成可直接引用的绝对地址。
const coverImage = computed(() =>
  toCoverImage(detail.cover, {
    apiBase: runtimeConfig.public.apiBase,
    altFallback: detail.title,
  }),
)

// 只渲染真实存在的链接；无数据时不生成任何伪造的 GitHub / Demo 链接。
const links = computed<LabLink[]>(() => {
  const result: LabLink[] = []

  if (detail.projectUrl) {
    result.push({ label: t('lab.linkProject'), href: detail.projectUrl })
  }

  if (detail.demoUrl) {
    result.push({ label: t('common.demo'), href: detail.demoUrl })
  }

  if (detail.githubUrl) {
    result.push({ label: t('common.github'), href: detail.githubUrl })
  }

  return result
})

const nextExperiment = computed(() => {
  const list = items.value

  if (list.length < 2) {
    return null
  }

  const currentIndex = list.findIndex((item) => item.slug === detail.slug)

  if (currentIndex === -1) {
    return null
  }

  return list[(currentIndex + 1) % list.length] ?? null
})

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => pageDescription.value,
})

useHead({
  link: [{ href: canonicalUrl, rel: 'canonical' }],
  meta: [
    ...(detail.publishedAt
      ? [{ property: 'article:published_time', content: detail.publishedAt }]
      : []),
    ...(detail.categories[0]
      ? [{ property: 'article:section', content: detail.categories[0] }]
      : []),
    ...detail.technologies.map((technology) => ({
      property: 'article:tag',
      content: technology,
    })),
    ...(coverImage.value
      ? [
          { key: 'og:image', property: 'og:image', content: coverImage.value.src },
          { key: 'twitter:image', name: 'twitter:image', content: coverImage.value.src },
        ]
      : []),
  ],
})
</script>

<template>
  <article>
    <LabDetailHero :experiment="detail" :links="links" />

    <div class="flex flex-col">
      <LabExperimentSection
        v-for="(section, index) in detail.sections"
        :key="section.id"
        :index="index + 1"
        :section="section"
        :technologies="detail.technologies"
      />

      <LabGallery v-if="detail.gallery.length > 0" :items="detail.gallery" :title="detail.title" />

      <AppSection v-if="links.length > 0" id="links" labelled-by="lab-links-heading" spacing="sm">
        <div class="flex flex-col gap-8">
          <AppSectionHeader id="lab-links-heading" :title="t('lab.links')" />
          <LabLinks :links="links" />
        </div>
      </AppSection>

      <AppSection
        v-if="nextExperiment"
        id="next-experiment"
        labelled-by="next-experiment-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-8">
          <AppSectionHeader id="next-experiment-heading" :title="t('lab.nextExperiment')" />
          <div class="flex flex-col">
            <LabItem :experiment="nextExperiment" :index="1" />
          </div>
        </div>
      </AppSection>
    </div>
  </article>
</template>
