<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const auth = useAuthStore()
const reference = useAdminReferenceService()
const {
  form,
  isSaving,
  saveError,
  saveSuccess,
  isDirty,
  translationStatus,
  save,
} = useAdminWorkEditor()

const categories = ref<Array<{ id: string; slug: string; name: string }>>([])
const tags = ref<Array<{ id: string; slug: string; name: string }>>([])
const optionsLoading = ref(true)

useSeoMeta({ title: () => `${t('admin.work.newWork')} — ESON`, robots: 'noindex, nofollow' })

onMounted(async () => {
  const token = auth.accessToken

  if (!token) {
    return
  }

  try {
    categories.value = await reference.fetchOptions(token, '/admin/categories')
    tags.value = await reference.fetchOptions(token, '/admin/tags')
  } finally {
    optionsLoading.value = false
  }
})

async function handleSave() {
  const saved = await save()

  if (saved) {
    await navigateTo('/admin/work')
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="type-h3">{{ t('admin.work.newWork') }}</h1>

    <div class="grid gap-6 desktop:grid-cols-2">
      <div class="flex flex-col gap-6">
        <AdminContentBasicFields v-model="form" namespace="work" />
        <AdminContentStatus v-model="form" namespace="work" />
      </div>
      <div class="flex flex-col gap-6">
        <AdminContentTranslations v-model="form" namespace="work" :translation-status="translationStatus" />
        <AdminContentTaxonomy
          v-model="form"
          namespace="work"
          :categories="categories"
          :is-loading="optionsLoading"
          :tags="tags"
        />
        <AdminContentMedia v-model="form" namespace="work" />
      </div>
    </div>

    <AdminContentPublishControls
      v-model="form"
      namespace="work"
      list-href="/admin/work"
      :is-dirty="isDirty"
      :is-saving="isSaving"
      :save-error="saveError"
      :save-success="saveSuccess"
      @request-delete="navigateTo('/admin/work')"
      @save="handleSave"
    />
  </div>
</template>
