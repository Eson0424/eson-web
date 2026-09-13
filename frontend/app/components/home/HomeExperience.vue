<script setup lang="ts">
import type { SectionContent } from '~/types/content'
import type { ExperienceSummary } from '~/types/experience'

const { section, status = 'success' } = defineProps<{
  section: SectionContent<ExperienceSummary>
  status?: 'pending' | 'success' | 'empty' | 'error'
}>()

const { t } = useI18n()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <AppSection labelled-by="experience-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="experience-heading"
        :index="section.index"
        :kicker="section.kicker"
        :lede="section.lede"
        :title="section.title"
      />

      <LoadingState v-if="status === 'pending'" :message="t('states.loadingExperience')" />

      <ErrorState
        v-else-if="status === 'error'"
        :hint="t('states.errorHint')"
        :message="t('states.errorExperience')"
        :retry-label="t('states.retry')"
        @retry="emit('retry')"
      />

      <div v-else-if="section.items.length > 0" class="flex flex-col">
        <ExperienceItem
          v-for="entry in section.items"
          :key="entry.id"
          :entry="entry"
        />
      </div>

      <EmptyState v-else :message="t('home.emptyExperience')" />
    </div>
  </AppSection>
</template>
