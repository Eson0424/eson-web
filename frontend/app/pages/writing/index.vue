<script setup lang="ts">
const { t } = useI18n()
const { items, featured, status, refresh } = useWritingList()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('writing.pageTitle')} — ESON`)
const pageDescription = computed(() => t('writing.pageLede'))
const canonicalUrl = computed(() => new URL('/writing', runtimeConfig.public.siteUrl).toString())

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
    <AppSection labelled-by="writing-page-heading" spacing="sm">
      <div class="flex flex-col gap-6 pt-16 desktop:pt-24">
        <p class="type-meta text-ink-secondary">[ {{ t('writing.pageKicker') }} ]</p>

        <h1 id="writing-page-heading" class="type-h1">{{ t('writing.pageTitle') }}</h1>

        <p class="type-body type-body-secondary type-reading-width">
          {{ t('writing.pageLede') }}
        </p>

        <p class="type-meta text-ink-muted">
          {{ t('writing.countLabel', { count: items.length }) }}
        </p>
      </div>
    </AppSection>

    <AppSection v-if="status === 'pending'" spacing="sm">
      <LoadingState :message="t('states.loadingWriting')" />
    </AppSection>

    <AppSection v-else-if="status === 'error'" spacing="sm">
      <ErrorState
        :hint="t('states.errorHint')"
        :message="t('states.errorWriting')"
        :retry-label="t('states.retry')"
        @retry="refresh()"
      />
    </AppSection>

    <AppSection v-else-if="status === 'empty'" spacing="sm">
      <EmptyState :hint="t('writing.emptyHint')" :message="t('writing.empty')" />
    </AppSection>

    <template v-else>
      <AppSection
        v-if="featured.length > 0"
        id="latest-writing"
        labelled-by="latest-writing-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="latest-writing-heading"
            :index="'01'"
            :kicker="t('writing.featured')"
            :title="t('writing.latestWriting')"
          />

          <div class="flex flex-col">
            <WritingItem
              v-for="(article, index) in featured"
              :key="article.id"
              :article="article"
              :index="index + 1"
            />
          </div>
        </div>
      </AppSection>

      <AppSection
        id="all-writing"
        labelled-by="all-writing-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="all-writing-heading"
            :index="'02'"
            :title="t('writing.allWriting')"
          />

          <div class="flex flex-col">
            <WritingItem
              v-for="(article, index) in items"
              :key="article.id"
              :article="article"
              :index="index + 1"
              variant="compact"
            />
          </div>
        </div>
      </AppSection>
    </template>
  </div>
</template>
