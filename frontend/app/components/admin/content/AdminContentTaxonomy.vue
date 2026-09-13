<script setup lang="ts">
import type { ContentFormState } from '~/utils/content-form'

const form = defineModel<ContentFormState>({ required: true })

const { namespace, categories, tags, isLoading } = defineProps<{
  namespace: 'work' | 'lab' | 'writing'
  categories: Array<{ id: string; slug: string; name: string }>
  tags: Array<{ id: string; slug: string; name: string }>
  isLoading: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <fieldset class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t(`admin.${namespace}.form.taxonomy`) }}</legend>

    <p v-if="isLoading" class="type-small text-ink-secondary">{{ t(`admin.${namespace}.form.loadingOptions`) }}</p>

    <div v-else class="grid gap-6 tablet:grid-cols-2">
      <div class="flex flex-col gap-3">
        <p class="type-meta text-ink-secondary">{{ t(`admin.${namespace}.form.categories`) }}</p>
        <p v-if="categories.length === 0" class="type-small text-ink-muted">
          {{ t(`admin.${namespace}.form.noOptions`) }}
        </p>
        <fieldset v-else class="flex flex-col gap-2">
          <legend class="sr-only">{{ t(`admin.${namespace}.form.categories`) }}</legend>
          <label
            v-for="category in categories"
            :key="category.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <input v-model="form.categoryIds" :value="category.id" type="checkbox">
            <span class="type-small text-ink">{{ category.name }}</span>
            <span class="type-meta text-ink-muted">{{ category.slug }}</span>
          </label>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3">
        <p class="type-meta text-ink-secondary">{{ t(`admin.${namespace}.form.tags`) }}</p>
        <p v-if="tags.length === 0" class="type-small text-ink-muted">
          {{ t(`admin.${namespace}.form.noOptions`) }}
        </p>
        <fieldset v-else class="flex flex-col gap-2">
          <legend class="sr-only">{{ t(`admin.${namespace}.form.tags`) }}</legend>
          <label
            v-for="tag in tags"
            :key="tag.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <input v-model="form.tagIds" :value="tag.id" type="checkbox">
            <span class="type-small text-ink">{{ tag.name }}</span>
            <span class="type-meta text-ink-muted">{{ tag.slug }}</span>
          </label>
        </fieldset>
      </div>
    </div>
  </fieldset>
</template>
