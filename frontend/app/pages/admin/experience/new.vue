<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { form, isSaving, saveError, saveSuccess, isDirty, translationStatus, save } =
  useAdminExperienceEditor()

useSeoMeta({
  title: () => `${t('admin.experience.newExperience')} — ESON`,
  robots: 'noindex, nofollow',
})

async function handleSave() {
  const saved = await save()

  if (saved) {
    await navigateTo('/admin/experience')
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="type-h3">{{ t('admin.experience.newExperience') }}</h1>

    <div class="grid gap-6 desktop:grid-cols-2">
      <div class="flex flex-col gap-6">
        <ExperienceBasicFields v-model="form" />
      </div>
      <div class="flex flex-col gap-6">
        <ExperienceTranslations v-model="form" :translation-status="translationStatus" />
      </div>
    </div>

    <ExperiencePublishControls
      v-model="form"
      :is-dirty="isDirty"
      :is-saving="isSaving"
      :save-error="saveError"
      :save-success="saveSuccess"
      @request-delete="navigateTo('/admin/experience')"
      @save="handleSave"
    />
  </div>
</template>
