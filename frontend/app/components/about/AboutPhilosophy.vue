<script setup lang="ts">
import type { AboutPhilosophyContent } from '~/types/about'

const { philosophy } = defineProps<{
  philosophy: AboutPhilosophyContent
}>()
</script>

<template>
  <AppSection labelled-by="about-philosophy-heading" tone="secondary">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="about-philosophy-heading"
        index="02"
        :lede="philosophy.lede"
        :title="philosophy.title"
      />

      <ol class="flex flex-col">
        <li
          v-for="(principle, index) in philosophy.principles"
          :key="principle.id"
          v-reveal="{ delay: index * 60 }"
          class="border-t border-line py-10 desktop:py-14"
        >
          <div class="grid gap-6 desktop:grid-cols-12">
            <p class="type-meta text-ink-muted desktop:col-span-1">
              {{ String(index + 1).padStart(2, '0') }}
            </p>

            <h3 class="type-h2 uppercase desktop:col-span-5">{{ principle.title }}</h3>

            <p class="type-body type-body-secondary desktop:col-span-6">
              {{ principle.body }}
            </p>
          </div>
        </li>
      </ol>
    </div>
  </AppSection>
</template>
