<script setup lang="ts">
import type { WorkLink } from '~/types/work'
import { toCoverImage } from '~/utils/cover'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const { items } = useWorkList()

const slug = computed(() => String(route.params.slug ?? ''))
const workData = useWorkDetail(slug)
await workData

const { work, notFound } = workData

// 未发布 / 不存在 → 真实 404；其它错误 → 500（不伪装成 404）
if (notFound.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('work.notFoundTitle'),
    message: t('work.notFoundMessage'),
    fatal: true,
  })
}

const detail = work.value

if (!detail) {
  throw createError({
    statusCode: 500,
    statusMessage: t('states.errorWork'),
    message: t('states.errorHint'),
    fatal: true,
  })
}

const pageTitle = computed(() => detail.seoTitle ?? `${detail.title} — ESON`)
const pageDescription = computed(() => detail.seoDescription ?? detail.summary)
const canonicalUrl = computed(
  () => new URL(`/work/${detail.slug}`, runtimeConfig.public.siteUrl).toString(),
)

// 封面已由 Public API 随内容返回（cover.url）；这里只把它解析成可直接引用的绝对地址。
const coverImage = computed(() =>
  toCoverImage(detail.cover, {
    apiBase: runtimeConfig.public.apiBase,
    altFallback: detail.title,
  }),
)

// 只渲染真实存在的链接；没有数据时不生成任何 GitHub / Demo 链接。
const links = computed<WorkLink[]>(() => {
  const result: WorkLink[] = []

  if (detail.projectUrl) {
    result.push({ label: t('work.linkProject'), href: detail.projectUrl })
  }

  if (detail.demoUrl) {
    result.push({ label: t('common.demo'), href: detail.demoUrl })
  }

  if (detail.githubUrl) {
    result.push({ label: t('common.github'), href: detail.githubUrl })
  }

  return result
})

const nextWork = computed(() => {
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
          { property: 'og:image', content: coverImage.value.src },
          { name: 'twitter:image', content: coverImage.value.src },
        ]
      : []),
  ],
})
</script>

<template>
  <article>
    <WorkDetailHero :links="links" :work="detail" />

    <div class="flex flex-col">
      <WorkCaseStudySection
        v-for="(section, index) in detail.sections"
        :key="section.id"
        :index="index + 1"
        :section="section"
        :technologies="detail.technologies"
      />

      <WorkGallery v-if="detail.gallery.length > 0" :items="detail.gallery" :title="detail.title" />

      <AppSection v-if="links.length > 0" id="links" labelled-by="links-heading" spacing="sm">
        <div class="flex flex-col gap-8">
          <AppSectionHeader id="links-heading" :title="t('work.links')" />
          <WorkLinks :links="links" />
        </div>
      </AppSection>

      <AppSection
        v-if="nextWork"
        id="next-work"
        labelled-by="next-work-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-8">
          <AppSectionHeader id="next-work-heading" :title="t('work.nextWork')" />
          <div class="flex flex-col">
            <WorkShowcaseItem :index="1" :work="nextWork" variant="compact" />
          </div>
        </div>
      </AppSection>
    </div>
  </article>
</template>
