<script setup lang="ts">
import type { SectionContent } from '~/types/content'
import type { WritingSummary } from '~/types/writing'

const { section, status = 'success' } = defineProps<{
  section: SectionContent<WritingSummary>
  status?: 'pending' | 'success' | 'empty' | 'error'
}>()

const { t } = useI18n()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <AppSection labelled-by="writing-heading">
    <div class="flex flex-col gap-10 desktop:gap-14">
      <AppSectionHeader
        id="writing-heading"
        :index="section.index"
        :kicker="section.kicker"
        :lede="section.lede"
        :title="section.title"
      >
        <template #actions>
          <AppLink :to="'/writing'" arrow class="type-small">
            {{ t('home.viewAllWriting') }}
          </AppLink>
        </template>
      </AppSectionHeader>

      <LoadingState v-if="status === 'pending'" :message="t('states.loadingWriting')" />

      <ErrorState
        v-else-if="status === 'error'"
        :hint="t('states.errorHint')"
        :message="t('states.errorWriting')"
        :retry-label="t('states.retry')"
        @retry="emit('retry')"
      />

      <div v-else-if="section.items.length > 0" class="flex flex-col">
        <WritingItem
          v-for="(article, index) in section.items"
          :key="article.id"
          :article="article"
          :index="index + 1"
        />
      </div>

      <EmptyState v-else :message="t('home.emptyWriting')" />
    </div>
  </AppSection>
</template>
