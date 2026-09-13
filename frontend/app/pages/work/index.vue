<script setup lang="ts">
const { t } = useI18n()
const { items, featured, remaining, status, refresh } = useWorkList()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('work.pageTitle')} — ESON`)
const pageDescription = computed(() => t('work.pageLede'))
const canonicalUrl = computed(() => new URL('/work', runtimeConfig.public.siteUrl).toString())

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
    <AppSection labelled-by="work-page-heading" spacing="sm">
      <div class="flex flex-col gap-6 pt-16 desktop:pt-24">
        <p class="type-meta text-ink-secondary">[ {{ t('work.pageKicker') }} ]</p>

        <h1 id="work-page-heading" class="type-h1">{{ t('work.pageTitle') }}</h1>

        <p class="type-body type-body-secondary type-reading-width">{{ t('work.pageLede') }}</p>

        <p class="type-meta text-ink-muted">
          {{ t('work.countLabel', { count: items.length }) }}
        </p>
      </div>
    </AppSection>

    <AppSection v-if="status === 'pending'" spacing="sm">
      <LoadingState :message="t('states.loadingWork')" />
    </AppSection>

    <AppSection v-else-if="status === 'error'" spacing="sm">
      <ErrorState
        :hint="t('states.errorHint')"
        :message="t('states.errorWork')"
        :retry-label="t('states.retry')"
        @retry="refresh()"
      />
    </AppSection>

    <AppSection v-else-if="status === 'empty'" spacing="sm">
      <EmptyState :hint="t('work.emptyHint')" :message="t('work.empty')" />
    </AppSection>

    <template v-else>
      <AppSection
        v-if="featured.length > 0"
        id="featured-work"
        labelled-by="featured-work-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="featured-work-heading"
            :index="'01'"
            :kicker="t('work.featured')"
            :title="t('work.featuredWork')"
          />

          <div class="flex flex-col">
            <WorkShowcaseItem
              v-for="(work, index) in featured"
              :key="work.id"
              :index="index + 1"
              :work="work"
            />
          </div>
        </div>
      </AppSection>

      <AppSection
        v-if="remaining.length > 0"
        id="more-work"
        labelled-by="more-work-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="more-work-heading"
            :index="'02'"
            :title="t('work.moreWork')"
          />

          <div class="flex flex-col">
            <WorkShowcaseItem
              v-for="(work, index) in remaining"
              :key="work.id"
              :index="featured.length + index + 1"
              :work="work"
              variant="compact"
            />
          </div>
        </div>
      </AppSection>
    </template>
  </div>
</template>
