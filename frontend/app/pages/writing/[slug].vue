<script setup lang="ts">
import { toCoverImage } from '~/utils/cover'

const route = useRoute()
const { t, locale } = useI18n()
const runtimeConfig = useRuntimeConfig()

const slug = computed(() => String(route.params.slug ?? ''))
const writingData = useWritingDetail(slug)
await writingData

const { article, notFound } = writingData
const { previous, next, related } = useWritingNavigation(slug)

if (notFound.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('writing.notFoundTitle'),
    message: t('writing.notFoundMessage'),
    fatal: true,
  })
}

const detail = article.value

if (!detail) {
  throw createError({
    statusCode: 500,
    statusMessage: t('states.errorWriting'),
    message: t('states.errorHint'),
    fatal: true,
  })
}

const pageTitle = computed(() => detail.seoTitle ?? `${detail.title} — ESON`)
const pageDescription = computed(() => detail.seoDescription ?? detail.excerpt)
const canonicalUrl = computed(
  () => new URL(`/writing/${detail.slug}`, runtimeConfig.public.siteUrl).toString(),
)

// 封面已由 Public API 随内容返回（cover.url）；视觉与 JSON-LD / OG 共用同一个 canonical URL。
const coverImage = computed(() =>
  toCoverImage(detail.cover, {
    apiBase: runtimeConfig.public.apiBase,
    altFallback: detail.title,
  }),
)

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
    ...detail.tags.map((tag) => ({ property: 'article:tag', content: tag })),
    ...(coverImage.value
      ? [
          { property: 'og:image', content: coverImage.value.src },
          { name: 'twitter:image', content: coverImage.value.src },
        ]
      : []),
  ],
})

/**
 * Article JSON-LD：只声明真实存在、可核实的信息。
 * 当前公开 API 不返回可核实的作者与更新时间，因此不写 author / dateModified，
 * 也不使用占位数据（与首页 JSON-LD 的原则一致）。
 */
const articleJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: detail.title,
  description: pageDescription.value,
  inLanguage: locale.value,
  url: canonicalUrl.value,
  mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
  ...(detail.publishedAt ? { datePublished: detail.publishedAt } : {}),
  ...(coverImage.value ? { image: [coverImage.value.src] } : {}),
  ...(detail.categories[0] ? { articleSection: detail.categories[0] } : {}),
  ...(detail.tags.length > 0 ? { keywords: detail.tags } : {}),
}))

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(articleJsonLd.value),
    },
  ],
})
</script>

<template>
  <article>
    <WritingArticleHeader :article="detail" />

    <AppSection id="article-content" labelled-by="article-content-heading" spacing="sm">
      <h2 id="article-content-heading" class="sr-only">{{ t('writing.articleContent') }}</h2>
      <WritingArticle :blocks="detail.content" />
    </AppSection>

    <AppSection spacing="sm">
      <WritingArticleFooter
        :next="next"
        :previous="previous"
        :related="related"
        :tags="detail.tags"
      />
    </AppSection>
  </article>
</template>
