<script setup lang="ts">
import type { ContactMethodsContent } from '~/types/contact'

const { methods } = defineProps<{
  methods: ContactMethodsContent
}>()

const { t } = useI18n()
</script>

<template>
  <AppSection labelled-by="contact-methods-heading" spacing="sm">
    <div class="flex flex-col gap-10">
      <AppSectionHeader
        id="contact-methods-heading"
        index="01"
        :lede="methods.lede"
        :title="methods.title"
      />

      <ul class="grid gap-x-10 gap-y-8 tablet:grid-cols-3">
        <li
          v-for="channel in methods.channels"
          :key="channel.id"
          v-reveal
          class="flex flex-col gap-3 border-t border-line pt-6"
        >
          <p class="type-meta text-ink-muted">{{ channel.label }}</p>

          <AppLink v-if="channel.href" :href="channel.href" class="type-small" external>
            {{ channel.value ?? channel.href }}
          </AppLink>

          <p v-else class="type-small text-ink-secondary">
            <span aria-hidden="true" class="mr-2 text-ink-muted">—</span>
            {{ t('contact.unconfigured') }}
          </p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
