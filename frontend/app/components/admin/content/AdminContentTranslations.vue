<script setup lang="ts">
import type { AppLocale } from '~/types/locale'
import type { ContentFormState } from '~/utils/content-form'

const form = defineModel<ContentFormState>({ required: true })

const { namespace, translationStatus, translationField = 'summary' } = defineProps<{
  namespace: 'work' | 'lab' | 'writing'
  translationStatus: { 'zh-CN': boolean; 'en-US': boolean; missing: AppLocale[] }
  /** Work / Lab 的摘要列是 summary，Writing 是 excerpt */
  translationField?: 'summary' | 'excerpt'
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
    <legend class="type-meta px-2 text-ink-muted">{{ t(`admin.${namespace}.form.translations`) }}</legend>

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
          {{ translationStatus[locale.code] ? t(`admin.${namespace}.translated`) : t(`admin.${namespace}.missing`) }}
        </AppBadge>
      </button>
    </div>

    <p v-if="translationStatus.missing.length > 0" class="type-small text-status-busy">
      <span aria-hidden="true" class="mr-2">!</span>
      {{ t(`admin.${namespace}.missingNotice`, { locales: translationStatus.missing.join(', ') }) }}
    </p>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-title-${activeLocale}`">
          {{ t(`admin.${namespace}.form.title`) }}
        </label>
        <input
          :id="`${namespace}-title-${activeLocale}`"
          v-model="form.translations[activeLocale].title"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="text"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-subtitle-${activeLocale}`">
          {{ t(`admin.${namespace}.form.subtitle`) }}
        </label>
        <input
          :id="`${namespace}-subtitle-${activeLocale}`"
          v-model="form.translations[activeLocale].subtitle"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="text"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-${translationField}-${activeLocale}`">
          {{ t(`admin.${namespace}.form.${translationField}`) }}
        </label>
        <textarea
          :id="`${namespace}-${translationField}-${activeLocale}`"
          v-model="form.translations[activeLocale][translationField]"
          class="min-h-24 resize-y rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" :for="`${namespace}-content-${activeLocale}`">
          {{ t(`admin.${namespace}.form.content`) }}
        </label>
        <textarea
          :id="`${namespace}-content-${activeLocale}`"
          v-model="form.translations[activeLocale].content"
          class="min-h-48 resize-y rounded-sm border border-line bg-background-secondary px-3 py-2 font-mono type-small text-ink"
        />
        <p class="type-meta text-ink-muted">{{ t(`admin.${namespace}.form.contentHint`) }}</p>
      </div>
    </div>
  </fieldset>
</template>
