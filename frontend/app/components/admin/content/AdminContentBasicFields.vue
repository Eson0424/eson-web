<script setup lang="ts">
import type { ContentFormState } from '~/utils/content-form'

const form = defineModel<ContentFormState>({ required: true })

const { namespace, showDates = true, showLinks = true } = defineProps<{
  /** i18n 命名空间：admin.work / admin.lab */
  namespace: 'work' | 'lab' | 'writing'
  /** Work 有 start/end date；labs 表没有这两列 */
  showDates?: boolean
  /** Work / Lab 有 github / demo / project 链接；writings 表没有这三列 */
  showLinks?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <fieldset class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t(`admin.${namespace}.form.basic`) }}</legend>

    <div class="grid gap-6 tablet:grid-cols-2">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-slug`">
          {{ t(`admin.${namespace}.form.slug`) }}
        </label>
        <input
          :id="`${namespace}-slug`"
          v-model="form.slug"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          type="text"
        >
        <p class="type-meta text-ink-muted">{{ t(`admin.${namespace}.form.slugHint`) }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-sort`">
          {{ t(`admin.${namespace}.form.sortOrder`) }}
        </label>
        <input
          :id="`${namespace}-sort`"
          v-model.number="form.sortOrder"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          min="0"
          type="number"
        >
      </div>

      <template v-if="showDates">
        <div class="flex flex-col gap-2">
          <label class="type-meta text-ink-secondary" :for="`${namespace}-start`">
            {{ t(`admin.${namespace}.form.startDate`) }}
          </label>
          <input
            :id="`${namespace}-start`"
            v-model="form.startDate"
            class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
            type="date"
          >
        </div>

        <div class="flex flex-col gap-2">
          <label class="type-meta text-ink-secondary" :for="`${namespace}-end`">
            {{ t(`admin.${namespace}.form.endDate`) }}
          </label>
          <input
            :id="`${namespace}-end`"
            v-model="form.endDate"
            class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
            type="date"
          >
        </div>
      </template>
    </div>

    <div v-if="showLinks" class="grid gap-6 tablet:grid-cols-3">
      <div v-for="field in [
        { key: 'githubUrl', label: t(`admin.${namespace}.form.githubUrl`) },
        { key: 'demoUrl', label: t(`admin.${namespace}.form.demoUrl`) },
        { key: 'projectUrl', label: t(`admin.${namespace}.form.projectUrl`) },
      ]" :key="field.key" class="flex flex-col gap-2">
        <label :for="`${namespace}-${field.key}`" class="type-meta text-ink-secondary">{{ field.label }}</label>
        <input
          :id="`${namespace}-${field.key}`"
          v-model="form[field.key as 'githubUrl' | 'demoUrl' | 'projectUrl']"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          placeholder="https://"
          type="url"
        >
      </div>
    </div>
  </fieldset>
</template>
