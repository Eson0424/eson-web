<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { t } = useI18n()

const experienceId = computed(() => String(route.params.id ?? ''))
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
} = useAdminExperienceEditor(experienceId.value)

const showDelete = ref(false)
const isDeleting = ref(false)
const deleteError = ref(false)
const deleteConfirmButton = useTemplateRef<HTMLButtonElement>('deleteConfirmButton')
const deleteDialogRoot = useTemplateRef<HTMLElement>('deleteDialogRoot')
const { handleKeydown: trapDeleteFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => deleteDialogRoot.value,
)

const deleteTargetRole = computed(() => {
  const zh = form.translations['zh-CN'].roleName.trim()
  const en = form.translations['en-US'].roleName.trim()

  return zh || en || t('admin.experience.untitled')
})

useSeoMeta({ title: () => `${t('admin.experience.editTitle')} — ESON`, robots: 'noindex, nofollow' })

async function openDeleteDialog() {
  rememberTrigger()
  deleteError.value = false
  showDelete.value = true
  await nextTick()
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
  await load()
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
  if (isDirty.value && !window.confirm(t('admin.experience.unsavedConfirm'))) {
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
    await navigateTo('/admin/experience')
    return
  }

  deleteError.value = true
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="type-h3">{{ t('admin.experience.editTitle') }}</h1>

    <LoadingState v-if="isLoading" :message="t('admin.experience.loading')" />

    <ErrorState
      v-else-if="loadError === 'not-found'"
      :message="t('admin.experience.errors.not-found')"
      :retry-label="t('admin.experience.backToList')"
      @retry="navigateTo('/admin/experience')"
    />

    <ErrorState
      v-else-if="loadError"
      :hint="t('states.errorHint')"
      :message="t('admin.experience.errors.load-failed')"
    />

    <template v-else>
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
        @request-delete="openDeleteDialog"
        @save="handleSave"
      />
    </template>

    <Transition name="menu">
      <div
        v-if="showDelete"
        ref="deleteDialogRoot"
        aria-labelledby="delete-experience-edit-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDeleteDialogKeydown"
      >
        <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 id="delete-experience-edit-title" class="type-h3">{{ t('admin.experience.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.experience.deleteBody', { title: deleteTargetRole, company: form.translations['zh-CN'].companyName.trim() || '—' }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.experience.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton
              ref="deleteConfirmButton"
              :disabled="isDeleting"
              variant="primary"
              @click="handleDelete"
            >
              {{ isDeleting ? t('admin.experience.deleting') : t('admin.experience.deleteConfirm') }}
            </AppButton>
            <AppButton variant="secondary" @click="closeDeleteDialog">
              {{ t('admin.experience.deleteCancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
