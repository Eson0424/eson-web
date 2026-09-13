<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const auth = useAuthStore()
const reference = useAdminReferenceService()
const { form, isSaving, saveError, saveSuccess, isDirty, translationStatus, save } =
  useAdminWritingEditor()

const categories = ref<Array<{ id: string; slug: string; name: string }>>([])
const tags = ref<Array<{ id: string; slug: string; name: string }>>([])
const optionsLoading = ref(true)

useSeoMeta({ title: () => `${t('admin.writing.newWriting')} — ESON`, robots: 'noindex, nofollow' })

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
    await navigateTo('/admin/writing')
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="type-h3">{{ t('admin.writing.newWriting') }}</h1>

    <div class="grid gap-6 desktop:grid-cols-2">
      <div class="flex flex-col gap-6">
        <AdminContentBasicFields v-model="form" namespace="writing" :show-dates="false" :show-links="false" />
        <AdminContentStatus v-model="form" namespace="writing" />
      </div>
      <div class="flex flex-col gap-6">
        <AdminContentTranslations
          v-model="form"
          namespace="writing"
          translation-field="excerpt"
          :translation-status="translationStatus"
        />
        <AdminContentTaxonomy
          v-model="form"
          namespace="writing"
          :categories="categories"
          :is-loading="optionsLoading"
          :tags="tags"
        />
        <AdminContentMedia v-model="form" namespace="writing" />
      </div>
    </div>

    <AdminContentPublishControls
      v-model="form"
      namespace="writing"
      list-href="/admin/writing"
      :is-dirty="isDirty"
      :is-saving="isSaving"
      :save-error="saveError"
      :save-success="saveSuccess"
      @request-delete="navigateTo('/admin/writing')"
      @save="handleSave"
    />
  </div>
</template>
