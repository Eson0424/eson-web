<script setup lang="ts">
import { EMPLOYMENT_TYPES, type ExperienceFormState } from '~/utils/experience-form'

const form = defineModel<ExperienceFormState>({ required: true })

const { t } = useI18n()

/**
 * 勾选「至今」时清空结束日期：
 * 输入框在 isCurrent 时是 disabled，如果保留旧值，用户既无法清空也会一直校验失败。
 * 后端仍会独立校验（isCurrent + endDate → 400）。
 */
watch(
  () => form.value.isCurrent,
  (isCurrent) => {
    if (isCurrent) {
      form.value.endDate = ''
    }
  },
)
</script>

<template>
  <fieldset class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t('admin.experience.form.basic') }}</legend>

    <div class="grid gap-6 tablet:grid-cols-2">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-sort">
          {{ t('admin.experience.form.sortOrder') }}
        </label>
        <input
          id="experience-sort"
          v-model.number="form.sortOrder"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          min="0"
          type="number"
        >
        <p class="type-meta text-ink-muted">{{ t('admin.experience.form.sortOrderHint') }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-employment-type">
          {{ t('admin.experience.form.employmentType') }}
        </label>
        <select
          id="experience-employment-type"
          v-model="form.employmentType"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.experience.form.employmentTypeNone') }}</option>
          <option v-for="type in EMPLOYMENT_TYPES" :key="type" :value="type">
            {{ t(`admin.experience.employmentTypes.${type}`) }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label class="type-meta text-ink-secondary" for="experience-location">
        {{ t('admin.experience.form.location') }}
      </label>
      <input
        id="experience-location"
        v-model="form.location"
        class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        type="text"
      >
    </div>

    <div class="grid gap-6 tablet:grid-cols-2">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-start">
          {{ t('admin.experience.form.startDate') }}
        </label>
        <input
          id="experience-start"
          v-model="form.startDate"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="date"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-end">
          {{ t('admin.experience.form.endDate') }}
        </label>
        <input
          id="experience-end"
          v-model="form.endDate"
          :disabled="form.isCurrent"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink disabled:opacity-60"
          type="date"
        >
        <p class="type-meta text-ink-muted">{{ t('admin.experience.form.endDateHint') }}</p>
      </div>
    </div>

    <label class="flex items-center gap-3">
      <input id="experience-current" v-model="form.isCurrent" type="checkbox">
      <span class="type-small text-ink">{{ t('admin.experience.form.isCurrent') }}</span>
    </label>
  </fieldset>
</template>
