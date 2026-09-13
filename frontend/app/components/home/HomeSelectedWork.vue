<script setup lang="ts">
import type { SectionContent, WorkSummary } from '~/types/content'

const { section, status = 'success' } = defineProps<{
  section: SectionContent<WorkSummary>
  /** 数据来自 API：pending / error 由 Section 自行渲染（组件 API 保持向后兼容） */
  status?: 'pending' | 'success' | 'empty' | 'error'
}>()

const { t } = useI18n()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <AppSection id="work" labelled-by="work-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="work-heading"
        :index="section.index"
        :kicker="section.kicker"
        :lede="section.lede"
        :title="section.title"
      >
        <template #actions>
          <AppLink :to="'/work'" arrow class="type-small">
            {{ t('home.viewAllWork') }}
          </AppLink>
        </template>
      </AppSectionHeader>

      <LoadingState v-if="status === 'pending'" :message="t('states.loadingWork')" />

      <ErrorState
        v-else-if="status === 'error'"
        :hint="t('states.errorHint')"
        :message="t('states.errorWork')"
        :retry-label="t('states.retry')"
        @retry="emit('retry')"
      />

      <div v-else-if="section.items.length > 0" class="flex flex-col">
        <WorkShowcaseItem
          v-for="(work, index) in section.items"
          :key="work.id"
          :index="index + 1"
          :work="work"
        />
      </div>

      <EmptyState v-else :message="t('home.emptyWork')" />
    </div>
  </AppSection>
</template>
