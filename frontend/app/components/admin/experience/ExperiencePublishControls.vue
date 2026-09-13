<script setup lang="ts">
import type { ExperienceFormState } from '~/utils/experience-form'

const form = defineModel<ExperienceFormState>({ required: true })

const { isSaving, isDirty, saveError, saveSuccess } = defineProps<{
  isSaving: boolean
  isDirty: boolean
  saveError: string | null
  saveSuccess: boolean
}>()

const emit = defineEmits<{ save: []; requestDelete: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4 rounded-md border border-line bg-surface/40 p-6">
    <p class="type-meta text-ink-muted">{{ t('admin.experience.form.noPublishState') }}</p>

    <p v-if="saveError" class="type-small text-status-busy" role="alert">
      <span aria-hidden="true" class="mr-2">!</span>{{ t(`admin.experience.errors.${saveError}`) }}
    </p>

    <p v-if="saveSuccess" class="type-small text-ink" role="status">
      <span aria-hidden="true" class="mr-2">✓</span>{{ t('admin.experience.saved') }}
    </p>

    <p v-else-if="isDirty" class="type-meta text-ink-muted">{{ t('admin.experience.unsaved') }}</p>

    <div class="flex flex-wrap items-center gap-4">
      <AppButton :disabled="isSaving" variant="primary" @click="emit('save')">
        {{ isSaving ? t('admin.experience.saving') : t('admin.experience.save') }}
      </AppButton>
      <AppButton variant="secondary" @click="emit('requestDelete')">
        {{ t('admin.experience.delete') }}
      </AppButton>
      <NuxtLink class="type-small text-ink-secondary hover:text-ink" to="/admin/experience">
        {{ t('admin.experience.backToList') }}
      </NuxtLink>
    </div>
  </div>
</template>
