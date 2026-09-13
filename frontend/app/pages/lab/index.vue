<script setup lang="ts">
const { t } = useI18n()
const { items, featured, remaining, status, refresh } = useLabList()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('lab.pageTitle')} — ESON`)
const pageDescription = computed(() => t('lab.pageLede'))
const canonicalUrl = computed(() => new URL('/lab', runtimeConfig.public.siteUrl).toString())

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
    <AppSection labelled-by="lab-page-heading" spacing="sm">
      <div class="flex flex-col gap-6 pt-16 desktop:pt-24">
        <p class="type-meta text-ink-secondary">[ {{ t('lab.pageKicker') }} ]</p>

        <h1 id="lab-page-heading" class="type-h1">{{ t('lab.pageTitle') }}</h1>

        <p class="type-body type-body-secondary type-reading-width">{{ t('lab.pageLede') }}</p>

        <p class="type-meta text-ink-muted">
          {{ t('lab.countLabel', { count: items.length }) }}
        </p>
      </div>
    </AppSection>

    <AppSection v-if="status === 'pending'" spacing="sm">
      <LoadingState :message="t('states.loadingLab')" />
    </AppSection>

    <AppSection v-else-if="status === 'error'" spacing="sm">
      <ErrorState
        :hint="t('states.errorHint')"
        :message="t('states.errorLab')"
        :retry-label="t('states.retry')"
        @retry="refresh()"
      />
    </AppSection>

    <AppSection v-else-if="status === 'empty'" spacing="sm">
      <EmptyState :hint="t('lab.emptyHint')" :message="t('lab.empty')" />
    </AppSection>

    <template v-else>
      <AppSection
        v-if="featured.length > 0"
        id="featured-experiments"
        labelled-by="featured-experiments-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="featured-experiments-heading"
            :index="'01'"
            :kicker="t('lab.featured')"
            :title="t('lab.featuredExperiments')"
          />

          <div class="flex flex-col">
            <LabItem
              v-for="(experiment, index) in featured"
              :key="experiment.id"
              :experiment="experiment"
              :index="index + 1"
              variant="specimen"
            />
          </div>
        </div>
      </AppSection>

      <AppSection
        v-if="remaining.length > 0"
        id="all-experiments"
        labelled-by="all-experiments-heading"
        spacing="sm"
      >
        <div class="flex flex-col gap-10">
          <AppSectionHeader
            id="all-experiments-heading"
            :index="'02'"
            :title="t('lab.allExperiments')"
          />

          <div class="flex flex-col">
            <LabItem
              v-for="(experiment, index) in remaining"
              :key="experiment.id"
              :experiment="experiment"
              :index="featured.length + index + 1"
            />
          </div>
        </div>
      </AppSection>
    </template>
  </div>
</template>
