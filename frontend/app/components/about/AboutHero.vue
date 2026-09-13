<script setup lang="ts">
import type { AboutHeroContent } from '~/types/about'

const { hero } = defineProps<{
  hero: AboutHeroContent
}>()
</script>

<template>
  <header class="relative isolate overflow-hidden border-b border-line">
    <div aria-hidden="true" class="about-backdrop pointer-events-none absolute inset-0" />

    <div class="relative">
      <AppContainer width="page">
        <div class="flex flex-col gap-8 pt-28 pb-14 desktop:pt-36 desktop:pb-20">
          <p class="type-meta text-ink-secondary">
            [ {{ hero.kicker }} ] / {{ hero.brand }}
          </p>

          <h1 :aria-label="hero.headline.join(' ')" class="type-display uppercase">
            <span v-for="line in hero.headline" :key="line" class="block">{{ line }}</span>
          </h1>

          <p class="type-body type-body-secondary type-reading-width">{{ hero.lead }}</p>
        </div>
      </AppContainer>
    </div>
  </header>
</template>

<style scoped>
.about-backdrop {
  background:
    radial-gradient(110% 80% at 25% -10%, rgb(20 24 32 / 92%), transparent 60%),
    linear-gradient(180deg, #0b0d12 0%, #07080c 78%);
}
</style>
