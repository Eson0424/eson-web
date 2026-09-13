<script setup lang="ts">
const { t } = useI18n()
const { content, fields } = useContactContent()
const runtimeConfig = useRuntimeConfig()

const pageTitle = computed(() => `${t('contact.pageTitle')} — ESON`)
const pageDescription = computed(() => content.value.hero.lead)
const canonicalUrl = computed(() => new URL('/contact', runtimeConfig.public.siteUrl).toString())

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
    <ContactHero :hero="content.hero" />
    <ContactMethods :methods="content.methods" />

    <AppSection labelled-by="contact-form-heading" spacing="sm">
      <div class="flex flex-col gap-10">
        <AppSectionHeader
          id="contact-form-heading"
          index="02"
          :lede="content.form.lede"
          :title="content.form.title"
        />

        <ContactForm
          :fields="fields"
          :integration-note="content.integrationNote"
          :submit-label="content.form.submitLabel"
        />
      </div>
    </AppSection>
  </div>
</template>
