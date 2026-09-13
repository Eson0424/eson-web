<script setup lang="ts">
import type { AboutCapabilitiesContent } from '~/types/about'

const { capabilities } = defineProps<{
  capabilities: AboutCapabilitiesContent
}>()
</script>

<template>
  <AppSection labelled-by="about-capabilities-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="about-capabilities-heading"
        index="03"
        :lede="capabilities.lede"
        :title="capabilities.title"
      />

      <ul class="grid gap-x-10 gap-y-8 tablet:grid-cols-2">
        <li
          v-for="item in capabilities.items"
          :key="item.id"
          v-reveal
          class="flex flex-col gap-4 border-t border-line pt-6"
        >
          <h3 class="type-h3">{{ item.title }}</h3>
          <p class="type-small text-ink-secondary">{{ item.description }}</p>
          <ul class="flex flex-wrap gap-2">
            <li v-for="technology in item.technologies" :key="technology">
              <AppBadge tone="muted" uppercase>{{ technology }}</AppBadge>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
