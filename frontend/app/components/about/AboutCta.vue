<script setup lang="ts">
import type { AboutCtaContent } from '~/types/about'

const { cta } = defineProps<{
  cta: AboutCtaContent
}>()
</script>

<template>
  <AppSection labelled-by="about-cta-heading" tone="secondary">
    <div class="flex flex-col gap-8">
      <AppSectionHeader
        id="about-cta-heading"
        index="05"
        :lede="cta.lede"
        :title="cta.title"
      />

      <ul class="flex flex-wrap gap-3">
        <li v-for="action in cta.actions" :key="action.to">
          <AppButton :to="action.to" variant="secondary">{{ action.label }}</AppButton>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
