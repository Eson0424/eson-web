<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()
const reference = useAdminReferenceService()

const labId = computed(() => String(route.params.id ?? ''))
const {
  form,
  isLoading,
  isSaving,
  loadError,
  saveError,
  saveSuccess,
  isDirty,
  translationStatus,
  load,
  save,
  remove,
} = useAdminLabEditor(labId.value)

const categories = ref<Array<{ id: string; slug: string; name: string }>>([])
const tags = ref<Array<{ id: string; slug: string; name: string }>>([])
const optionsLoading = ref(true)
const showDelete = ref(false)
const isDeleting = ref(false)
const deleteError = ref(false)
const deleteConfirmButton = useTemplateRef<HTMLButtonElement>('deleteConfirmButton')
const deleteDialogRoot = useTemplateRef<HTMLElement>('deleteDialogRoot')
const { handleKeydown: trapDeleteFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => deleteDialogRoot.value,
)

/** 删除确认使用当前语言标题（缺失时退回另一种语言，再退回 slug） */
const deleteTargetTitle = computed(() => {
  const zh = form.translations['zh-CN'].title.trim()
  const en = form.translations['en-US'].title.trim()

  return zh || en || form.slug
})

useSeoMeta({ title: () => `${t('admin.lab.editTitle')} — ESON`, robots: 'noindex, nofollow' })

async function openDeleteDialog() {
  rememberTrigger()
  deleteError.value = false
  showDelete.value = true
  await nextTick()
  // 焦点进入对话框：既是可访问性要求，也让 Escape 能在对话框内生效
  deleteConfirmButton.value?.focus()
}

function closeDeleteDialog() {
  showDelete.value = false
  deleteError.value = false
  restoreTrigger()
}

function handleDeleteDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDeleteDialog()
    return
  }

  trapDeleteFocus(event)
}

onMounted(async () => {
  const token = auth.accessToken

  await load()

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

// 未保存修改的离开提示（浏览器刷新/关闭）
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

// 站内路由离开提示
onBeforeRouteLeave(() => {
  if (isDirty.value && !window.confirm(t('admin.lab.unsavedConfirm'))) {
    return false
  }

  return true
})

async function handleSave() {
  await save()
}

async function handleDelete() {
  isDeleting.value = true
  deleteError.value = false

  const deleted = await remove()

  isDeleting.value = false

  if (deleted) {
    await navigateTo('/admin/lab')
    return
  }

  deleteError.value = true
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="type-h3">{{ t('admin.lab.editTitle') }}</h1>

    <LoadingState v-if="isLoading" :message="t('admin.lab.loading')" />

    <ErrorState
      v-else-if="loadError === 'not-found'"
      :message="t('admin.lab.errors.not-found')"
      :retry-label="t('admin.lab.backToList')"
      @retry="navigateTo('/admin/lab')"
    />

    <ErrorState
      v-else-if="loadError"
      :hint="t('states.errorHint')"
      :message="t('admin.lab.errors.load-failed')"
    />

    <template v-else>
      <div class="grid gap-6 desktop:grid-cols-2">
        <div class="flex flex-col gap-6">
          <AdminContentBasicFields v-model="form" namespace="lab" :show-dates="false" />
          <AdminContentStatus v-model="form" namespace="lab" />
        </div>
        <div class="flex flex-col gap-6">
          <AdminContentTranslations v-model="form" namespace="lab" :translation-status="translationStatus" />
          <AdminContentTaxonomy
            v-model="form"
            namespace="lab"
            :categories="categories"
            :is-loading="optionsLoading"
            :tags="tags"
          />
          <AdminContentMedia v-model="form" namespace="lab" />
        </div>
      </div>

      <AdminContentPublishControls
        v-model="form"
        namespace="lab"
        list-href="/admin/lab"
        :is-dirty="isDirty"
        :is-saving="isSaving"
        :save-error="saveError"
        :save-success="saveSuccess"
        @request-delete="openDeleteDialog"
        @save="handleSave"
      />
    </template>

    <Transition name="menu">
      <div
        v-if="showDelete"
        ref="deleteDialogRoot"
        aria-labelledby="delete-lab-edit-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDeleteDialogKeydown"
      >
        <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 id="delete-lab-edit-title" class="type-h3">{{ t('admin.lab.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.lab.deleteBody', { title: deleteTargetTitle, slug: form.slug }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.lab.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton
              ref="deleteConfirmButton"
              :disabled="isDeleting"
              variant="primary"
              @click="handleDelete"
            >
              {{ isDeleting ? t('admin.lab.deleting') : t('admin.lab.deleteConfirm') }}
            </AppButton>
            <AppButton variant="secondary" @click="closeDeleteDialog">
              {{ t('admin.lab.deleteCancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
