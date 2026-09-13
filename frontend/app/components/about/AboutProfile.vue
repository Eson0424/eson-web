<script setup lang="ts">
import type { AboutProfileContent } from '~/types/about'

const { profile } = defineProps<{
  profile: AboutProfileContent
}>()
</script>

<template>
  <AppSection labelled-by="about-profile-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="about-profile-heading"
        index="01"
        :lede="profile.lede"
        :title="profile.title"
      />

      <ul class="grid gap-x-10 gap-y-8 desktop:grid-cols-3">
        <li
          v-for="area in profile.areas"
          :key="area.id"
          v-reveal
          class="flex flex-col gap-3 border-t border-line pt-6"
        >
          <h3 class="type-h3">{{ area.label }}</h3>
          <p class="type-small text-ink-secondary">{{ area.description }}</p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
