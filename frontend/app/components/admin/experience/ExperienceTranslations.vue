<script setup lang="ts">
import type { AppLocale } from '~/types/locale'
import type { ExperienceFormState } from '~/utils/experience-form'

const form = defineModel<ExperienceFormState>({ required: true })

const { translationStatus } = defineProps<{
  translationStatus: { 'zh-CN': boolean; 'en-US': boolean; missing: AppLocale[] }
}>()

const { t } = useI18n()

const LOCALES: Array<{ code: AppLocale; label: string }> = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en-US', label: 'English' },
]

const activeLocale = ref<AppLocale>('zh-CN')
</script>

<template>
  <fieldset class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t('admin.experience.form.translations') }}</legend>

    <div class="flex flex-wrap items-center gap-4">
      <button
        v-for="locale in LOCALES"
        :key="locale.code"
        :aria-pressed="activeLocale === locale.code"
        :class="
          cn(
            'type-small rounded-sm border px-3 py-2',
            activeLocale === locale.code
              ? 'border-line-strong bg-surface text-ink'
              : 'border-line text-ink-secondary hover:text-ink',
          )
        "
        type="button"
        @click="activeLocale = locale.code"
      >
        {{ locale.label }}
        <AppBadge :tone="translationStatus[locale.code] ? 'accent' : 'outline'" class="ml-2" uppercase>
          {{ translationStatus[locale.code] ? t('admin.experience.translated') : t('admin.experience.missing') }}
        </AppBadge>
      </button>
    </div>

    <p v-if="translationStatus.missing.length > 0" class="type-small text-status-busy">
      <span aria-hidden="true" class="mr-2">!</span>
      {{ t('admin.experience.missingNotice', { locales: translationStatus.missing.join(', ') }) }}
    </p>

    <p class="type-meta text-ink-muted">{{ t('admin.experience.form.translationSourceHint') }}</p>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`experience-role-${activeLocale}`">
          {{ t('admin.experience.form.roleName') }}
        </label>
        <input
          :id="`experience-role-${activeLocale}`"
          v-model="form.translations[activeLocale].roleName"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          required
          type="text"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`experience-company-${activeLocale}`">
          {{ t('admin.experience.form.companyName') }}
        </label>
        <input
          :id="`experience-company-${activeLocale}`"
          v-model="form.translations[activeLocale].companyName"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="text"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`experience-summary-${activeLocale}`">
          {{ t('admin.experience.form.summary') }}
        </label>
        <textarea
          :id="`experience-summary-${activeLocale}`"
          v-model="form.translations[activeLocale].summary"
          class="min-h-24 resize-y rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        />
        <p class="type-meta text-ink-muted">{{ t('admin.experience.form.summaryHint') }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`experience-content-${activeLocale}`">
          {{ t('admin.experience.form.content') }}
        </label>
        <textarea
          :id="`experience-content-${activeLocale}`"
          v-model="form.translations[activeLocale].content"
          class="min-h-32 resize-y rounded-sm border border-line bg-background-secondary px-3 py-2 type-small text-ink"
        />
        <p class="type-meta text-ink-muted">{{ t('admin.experience.form.contentHint') }}</p>
      </div>
    </div>
  </fieldset>
</template>
