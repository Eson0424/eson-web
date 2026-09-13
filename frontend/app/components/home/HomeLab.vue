<script setup lang="ts">
import type { SectionContent } from '~/types/content'
import type { LabSummary } from '~/types/lab'

const { section, status = 'success' } = defineProps<{
  section: SectionContent<LabSummary>
  status?: 'pending' | 'success' | 'empty' | 'error'
}>()

const { t } = useI18n()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <AppSection labelled-by="lab-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="lab-heading"
        :index="section.index"
        :kicker="section.kicker"
        :lede="section.lede"
        :title="section.title"
      >
        <template #actions>
          <AppLink :to="'/lab'" arrow class="type-small">
            {{ t('home.viewAllLab') }}
          </AppLink>
        </template>
      </AppSectionHeader>

      <LoadingState v-if="status === 'pending'" :message="t('states.loadingLab')" />

      <ErrorState
        v-else-if="status === 'error'"
        :hint="t('states.errorHint')"
        :message="t('states.errorLab')"
        :retry-label="t('states.retry')"
        @retry="emit('retry')"
      />

      <div v-else-if="section.items.length > 0" class="flex flex-col">
        <LabItem
          v-for="(experiment, index) in section.items"
          :key="experiment.id"
          :experiment="experiment"
          :index="index + 1"
        />
      </div>

      <EmptyState v-else :message="t('home.emptyLab')" />
    </div>
  </AppSection>
</template>
