<script setup lang="ts">
import type { ContentFormState, ContentStatusValue } from '~/utils/content-form'

const form = defineModel<ContentFormState>({ required: true })

const { namespace } = defineProps<{ namespace: 'work' | 'lab' | 'writing' }>()

const { t } = useI18n()

const STATUSES: ContentStatusValue[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
</script>

<template>
  <fieldset class="flex flex-col gap-4 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t(`admin.${namespace}.form.status`) }}</legend>

    <div class="flex flex-wrap gap-6">
      <label v-for="status in STATUSES" :key="status" class="flex items-center gap-2">
        <input v-model="form.status" :value="status" :name="`${namespace}-status`" type="radio">
        <span class="type-small text-ink">{{ t(`admin.${namespace}.status.${status.toLowerCase()}`) }}</span>
      </label>
    </div>

    <div class="flex flex-col gap-2">
      <label class="type-meta text-ink-secondary" :for="`${namespace}-published-at`">
        {{ t(`admin.${namespace}.form.publishedAt`) }}
      </label>
      <input
        :id="`${namespace}-published-at`"
        v-model="form.publishedAt"
        class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        type="date"
      >
      <p class="type-meta text-ink-muted">{{ t(`admin.${namespace}.form.publishedAtHint`) }}</p>
    </div>
  </fieldset>
</template>
