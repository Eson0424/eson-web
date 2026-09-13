<script setup lang="ts">
import type { IntroContent } from '~/types/content'

const { intro } = defineProps<{
  intro: IntroContent
}>()
</script>

<template>
  <AppSection spacing="sm">
    <div class="grid gap-10 desktop:grid-cols-12 desktop:gap-8">
      <h2 :aria-label="intro.headline.join(' ')" class="type-h2 desktop:col-span-7">
        <span
          v-for="(line, index) in intro.headline"
          :key="line"
          v-reveal="{ delay: index * 80 }"
          class="block"
        >
          {{ line }}
        </span>
      </h2>

      <div class="flex flex-col gap-8 desktop:col-span-5">
        <p v-reveal class="type-body type-body-secondary">{{ intro.body }}</p>

        <ul v-reveal class="flex flex-wrap gap-x-6 gap-y-3">
          <li
            v-for="area in intro.focusAreas"
            :key="area"
            class="type-meta text-ink-muted"
          >
            {{ area }}
          </li>
        </ul>
      </div>
    </div>
  </AppSection>
</template>
