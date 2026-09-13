<script setup lang="ts">
import type { LabSection as LabSectionContent } from '~/types/lab'

const { section, index, technologies } = defineProps<{
  section: LabSectionContent
  index: number
  technologies?: string[]
}>()

const { t } = useI18n()

const headingId = computed(() => `${section.id}-heading`)
const displayIndex = computed(() => String(index).padStart(2, '0'))
const showTechnologies = computed(
  () => section.kind === 'technology' && Boolean(technologies?.length),
)
const showPreview = computed(() => section.kind === 'interaction')
</script>

<template>
  <AppSection :id="section.id" :labelled-by="headingId" spacing="sm">
    <div class="flex flex-col gap-8">
      <AppSectionHeader :id="headingId" :index="displayIndex" :title="section.title" />

      <div v-reveal class="flex flex-col gap-6">
        <ProseContent :bullets="section.bullets" :paragraphs="section.paragraphs" />

        <ul v-if="showTechnologies" class="flex flex-wrap gap-2">
          <li v-for="technology in technologies" :key="technology">
            <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
          </li>
        </ul>

        <div v-if="showPreview" class="flex flex-col gap-4">
          <div class="specimen-frame rounded-md border border-line p-3">
            <PlaceholderVisual
              :label="t('lab.previewPlaceholder', { title: section.title })"
              ratio="16 / 9"
              :seed="4"
            />
          </div>
          <p class="type-small text-ink-muted">{{ t('lab.noDemoNote') }}</p>
        </div>
      </div>
    </div>
  </AppSection>
</template>

<style scoped>
.specimen-frame {
  background:
    linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px;
}
</style>
