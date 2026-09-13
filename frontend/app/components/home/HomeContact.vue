<script setup lang="ts">
import type { ContactContent } from '~/types/content'

const { contact } = defineProps<{
  contact: ContactContent
}>()
</script>

<template>
  <AppSection id="contact" labelled-by="contact-heading" tone="secondary">
    <div class="grid gap-10 desktop:grid-cols-12 desktop:items-end desktop:gap-8">
      <div class="flex flex-col gap-6 desktop:col-span-8">
        <h2 id="contact-heading" :aria-label="contact.headline.join(' ')" class="type-h1">
          <span v-for="line in contact.headline" :key="line" class="block">{{ line }}</span>
        </h2>

        <p class="type-body type-body-secondary type-reading-width">{{ contact.body }}</p>
      </div>

      <div class="flex flex-col gap-6 desktop:col-span-4 desktop:items-end">
        <AppButton
          v-if="contact.action.to"
          :to="contact.action.to"
          size="lg"
          variant="primary"
        >
          {{ contact.action.label }}
        </AppButton>

        <AppButton
          v-else-if="contact.action.href"
          :href="contact.action.href"
          external
          size="lg"
          variant="primary"
        >
          {{ contact.action.label }}
        </AppButton>

        <ul v-if="contact.socials.length > 0" class="flex flex-wrap gap-6 desktop:justify-end">
          <li v-for="social in contact.socials" :key="social.href">
            <AppLink :href="social.href" class="type-small" external>{{ social.label }}</AppLink>
          </li>
        </ul>
      </div>
    </div>
  </AppSection>
</template>
