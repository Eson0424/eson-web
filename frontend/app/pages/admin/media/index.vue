<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const {
  query,
  items,
  meta,
  status,
  error,
  refresh,
  isUploading,
  uploadErrorKey,
  uploadSuccess,
  uploadFile,
  editingItem,
  editingAlt,
  isSavingAlt,
  altErrorKey,
  openAltEditor,
  closeAltEditor,
  saveAlt,
  pendingDelete,
  isDeleting,
  deleteErrorKey,
  deleteReferences,
  openDeleteDialog,
  closeDeleteDialog,
  confirmDelete,
} = useAdminMediaLibrary()

useSeoMeta({ title: () => `${t('admin.nav.media')} — ESON`, robots: 'noindex, nofollow' })

function handleUpload(payload: { file: File; alt: string }) {
  void uploadFile(payload.file, payload.alt)
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <h1 class="type-h3">{{ t('admin.media.listTitle') }}</h1>
      <p class="type-small text-ink-secondary">{{ t('admin.media.listLede') }}</p>
    </div>

    <MediaUploadPanel
      :error-key="uploadErrorKey"
      :is-uploading="isUploading"
      :success="uploadSuccess"
      @upload="handleUpload"
    />

    <LoadingState v-if="status === 'pending'" :message="t('admin.media.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.media.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="items.length === 0" :hint="t('admin.media.emptyHint')" :message="t('admin.media.empty')" />

    <div v-else class="flex flex-col gap-6">
      <MediaGrid :disabled="isDeleting" :items="items" @edit="openAltEditor" @remove="openDeleteDialog" />

      <div v-if="meta && meta.totalPages > 1" class="flex flex-wrap items-center gap-4">
        <AppButton
          :disabled="query.page <= 1"
          variant="secondary"
          @click="query.page = Math.max(1, query.page - 1)"
        >
          {{ t('admin.media.previous') }}
        </AppButton>
        <p class="type-meta text-ink-muted">
          {{ t('admin.media.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
        </p>
        <AppButton
          :disabled="query.page >= meta.totalPages"
          variant="secondary"
          @click="query.page = Math.min(meta.totalPages, query.page + 1)"
        >
          {{ t('admin.media.next') }}
        </AppButton>
      </div>
    </div>

    <Transition name="menu">
      <MediaAltDialog
        v-if="editingItem"
        v-model:alt="editingAlt"
        :error-key="altErrorKey"
        :is-saving="isSavingAlt"
        :item="editingItem"
        @close="closeAltEditor"
        @save="saveAlt"
      />
    </Transition>

    <Transition name="menu">
      <MediaDeleteDialog
        v-if="pendingDelete"
        :error-key="deleteErrorKey"
        :is-deleting="isDeleting"
        :item="pendingDelete"
        :references="deleteReferences"
        @close="closeDeleteDialog"
        @confirm="confirmDelete"
      />
    </Transition>
  </div>
</template>
