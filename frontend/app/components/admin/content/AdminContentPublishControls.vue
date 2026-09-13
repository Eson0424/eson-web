<script setup lang="ts">
import type { ContentFormState } from '~/utils/content-form'

const form = defineModel<ContentFormState>({ required: true })

const { namespace, listHref, isSaving, isDirty, saveError, saveSuccess } = defineProps<{
  namespace: 'work' | 'lab' | 'writing'
  listHref: string
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
    <label class="flex items-center gap-3">
      <input v-model="form.featured" type="checkbox">
      <span class="type-small text-ink">{{ t(`admin.${namespace}.form.featured`) }}</span>
    </label>

    <p v-if="saveError" class="type-small text-status-busy" role="alert">
      <span aria-hidden="true" class="mr-2">!</span>{{ t(`admin.${namespace}.errors.${saveError}`) }}
    </p>

    <p v-if="saveSuccess" class="type-small text-ink" role="status">
      <span aria-hidden="true" class="mr-2">✓</span>{{ t(`admin.${namespace}.saved`) }}
    </p>

    <p v-else-if="isDirty" class="type-meta text-ink-muted">{{ t(`admin.${namespace}.unsaved`) }}</p>

    <div class="flex flex-wrap items-center gap-4">
      <AppButton :disabled="isSaving" variant="primary" @click="emit('save')">
        {{ isSaving ? t(`admin.${namespace}.saving`) : t(`admin.${namespace}.save`) }}
      </AppButton>
      <AppButton variant="secondary" @click="emit('requestDelete')">
        {{ t(`admin.${namespace}.delete`) }}
      </AppButton>
      <NuxtLink class="type-small text-ink-secondary hover:text-ink" :to="listHref">
        {{ t(`admin.${namespace}.backToList`) }}
      </NuxtLink>
    </div>
  </div>
</template>
