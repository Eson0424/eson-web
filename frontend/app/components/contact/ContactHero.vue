<script setup lang="ts">
import type { ContactHeroContent } from '~/types/contact'

const { hero } = defineProps<{
  hero: ContactHeroContent
}>()
</script>

<template>
  <header class="relative isolate overflow-hidden border-b border-line">
    <div aria-hidden="true" class="contact-backdrop pointer-events-none absolute inset-0" />

    <div class="relative">
      <AppContainer width="page">
        <div class="flex flex-col gap-8 pt-28 pb-14 desktop:pt-36 desktop:pb-20">
          <p class="type-meta text-ink-secondary">[ {{ hero.kicker }} ]</p>

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
.contact-backdrop {
  background:
    radial-gradient(100% 80% at 70% -10%, rgb(61 107 255 / 10%), transparent 58%),
    linear-gradient(180deg, #0b0d12 0%, #07080c 78%);
}
</style>
