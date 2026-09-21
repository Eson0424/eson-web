<script setup lang="ts">
const { t } = useI18n()
const { items, status, refresh } = useExperienceList()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('experience.pageTitle')} — ESON`)
const pageDescription = computed(() => t('experience.pageLede'))
const canonicalUrl = computed(() => new URL('/experience', runtimeConfig.public.siteUrl).toString())

const countLabel = computed(() => t('experience.countLabel', { count: items.value.length }))

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
    <AppSection labelled-by="experience-page-heading" spacing="sm">
      <div class="flex flex-col gap-6 pt-16 desktop:pt-24">
        <p class="type-meta text-ink-secondary">[ {{ t('experience.pageKicker') }} ]</p>

        <h1 id="experience-page-heading" class="type-h1">{{ t('experience.pageTitle') }}</h1>

        <p class="type-body type-body-secondary type-reading-width">
          {{ t('experience.pageLede') }}
        </p>

        <p class="type-meta text-ink-muted">{{ countLabel }}</p>
      </div>
    </AppSection>

    <AppSection v-if="status === 'pending'" spacing="sm">
      <LoadingState :message="t('states.loadingExperience')" />
    </AppSection>

    <AppSection v-else-if="status === 'error'" spacing="sm">
      <ErrorState
        :hint="t('states.errorHint')"
        :message="t('states.errorExperience')"
        :retry-label="t('states.retry')"
        @retry="refresh()"
      />
    </AppSection>

    <AppSection v-else-if="status === 'empty'" spacing="sm">
      <EmptyState :hint="t('experience.emptyHint')" :message="t('experience.empty')" />
    </AppSection>

    <AppSection v-else labelled-by="experience-list-heading" spacing="sm">
      <div class="flex flex-col gap-10">
        <AppSectionHeader
          id="experience-list-heading"
          index="01"
          :kicker="t('experience.kicker')"
          :title="t('experience.listTitle')"
        />

        <ExperienceTimeline :items="items" />
      </div>
    </AppSection>
  </div>
</template>
