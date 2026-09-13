<script setup lang="ts">
import type { Capability, SectionContent } from '~/types/content'

const { section } = defineProps<{
  section: SectionContent<Capability>
}>()

const { t } = useI18n()

function displayIndex(index: number) {
  return String(index).padStart(2, '0')
}
</script>

<template>
  <AppSection labelled-by="capabilities-heading" tone="secondary">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="capabilities-heading"
        :index="section.index"
        :kicker="section.kicker"
        :lede="section.lede"
        :title="section.title"
      />

      <ul v-if="section.items.length > 0" class="flex flex-col">
        <li
          v-for="(capability, index) in section.items"
          :key="capability.id"
          v-reveal
          class="border-t border-line py-8 desktop:py-10"
        >
          <div class="grid gap-4 desktop:grid-cols-12 desktop:gap-6">
            <p class="type-meta text-ink-muted desktop:col-span-1">
              {{ displayIndex(index + 1) }}
            </p>

            <h3 class="type-h3 desktop:col-span-4">{{ capability.title }}</h3>

            <p class="type-body type-body-secondary desktop:col-span-5">
              {{ capability.description }}
            </p>

            <ul class="flex flex-wrap gap-2 desktop:col-span-2 desktop:justify-end">
              <li v-for="technology in capability.technologies" :key="technology">
                <AppBadge tone="muted" uppercase>{{ technology }}</AppBadge>
              </li>
            </ul>
          </div>
        </li>
      </ul>

      <EmptyState v-else :message="t('home.emptyCapabilities')" />
    </div>
  </AppSection>
</template>
