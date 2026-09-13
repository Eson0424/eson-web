<script setup lang="ts">
import type { AdminWritingListItem } from '~/services/admin-writing.service'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { query, items, meta, status, error, refresh, removeWriting, resetFilters } =
  useAdminWritingList()

const pendingDelete = ref<AdminWritingListItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref(false)
const confirmButton = useTemplateRef<HTMLButtonElement>('confirmButton')
const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

useSeoMeta({ title: () => `${t('admin.nav.writing')} — ESON`, robots: 'noindex, nofollow' })

async function openDeleteDialog(item: AdminWritingListItem) {
  rememberTrigger()
  pendingDelete.value = item
  deleteError.value = false
  await nextTick()
  confirmButton.value?.focus()
}

function closeDeleteDialog() {
  pendingDelete.value = null
  deleteError.value = false
  restoreTrigger()
}

async function confirmDelete() {
  if (!pendingDelete.value) {
    return
  }

  isDeleting.value = true
  deleteError.value = false

  try {
    await removeWriting(pendingDelete.value.id)
    closeDeleteDialog()
  } catch {
    deleteError.value = true
  } finally {
    isDeleting.value = false
  }
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDeleteDialog()
    return
  }

  trapFocus(event)
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-2">
        <h1 class="type-h3">{{ t('admin.writing.listTitle') }}</h1>
        <p class="type-small text-ink-secondary">{{ t('admin.writing.listLede') }}</p>
      </div>
      <AppButton :to="'/admin/writing/new'" variant="primary">
        {{ t('admin.writing.newWriting') }}
      </AppButton>
    </div>

    <form class="flex flex-wrap items-end gap-4" @submit.prevent="refresh()">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="writing-filter-search">
          {{ t('admin.writing.search') }}
        </label>
        <input
          id="writing-filter-search"
          v-model="query.search"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="search"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="writing-filter-status">
          {{ t('admin.writing.filterStatus') }}
        </label>
        <select
          id="writing-filter-status"
          v-model="query.status"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.writing.all') }}</option>
          <option value="DRAFT">{{ t('admin.writing.status.draft') }}</option>
          <option value="PUBLISHED">{{ t('admin.writing.status.published') }}</option>
          <option value="ARCHIVED">{{ t('admin.writing.status.archived') }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="writing-filter-featured">
          {{ t('admin.writing.filterFeatured') }}
        </label>
        <select
          id="writing-filter-featured"
          v-model="query.featured"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.writing.all') }}</option>
          <option value="true">{{ t('admin.writing.featuredOnly') }}</option>
          <option value="false">{{ t('admin.writing.notFeatured') }}</option>
        </select>
      </div>

      <AppButton type="submit" variant="secondary">{{ t('admin.writing.apply') }}</AppButton>
      <AppButton variant="ghost" @click="resetFilters">{{ t('admin.writing.reset') }}</AppButton>
    </form>

    <LoadingState v-if="status === 'pending'" :message="t('admin.writing.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.writing.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="items.length === 0" :message="t('admin.writing.empty')" />

    <div v-else class="flex flex-col gap-4">
      <div class="overflow-x-auto rounded-md border border-line">
        <table class="w-full min-w-[52rem] border-collapse text-left">
          <caption class="sr-only">{{ t('admin.writing.listTitle') }}</caption>
          <thead class="bg-surface/60">
            <tr>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.title') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.slug') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.status') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.featured') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.locales') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.taxonomy') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.updatedAt') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.writing.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-t border-line">
              <td class="type-small px-4 py-3 text-ink">{{ item.title }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.slug }}</td>
              <td class="px-4 py-3">
                <AppBadge :tone="item.status === 'PUBLISHED' ? 'accent' : 'outline'" uppercase>
                  {{ t(`admin.writing.status.${item.status.toLowerCase()}`) }}
                </AppBadge>
              </td>
              <td class="type-small px-4 py-3 text-ink-secondary">
                {{ item.featured ? t('admin.writing.yes') : t('admin.writing.no') }}
              </td>
              <td class="px-4 py-3">
                <span class="type-meta text-ink-secondary">
                  zh-CN: {{ item.translationStatus['zh-CN'] ? t('admin.writing.translated') : t('admin.writing.missing') }}
                </span>
                <span class="type-meta ml-3 text-ink-secondary">
                  en-US: {{ item.translationStatus['en-US'] ? t('admin.writing.translated') : t('admin.writing.missing') }}
                </span>
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">
                {{ [...item.categories, ...item.tags].map((entry) => entry.name).join(', ') }}
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.updatedAt.slice(0, 10) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-4">
                  <AppLink :to="`/admin/writing/${item.id}/edit`" class="type-small">
                    {{ t('admin.writing.edit') }}
                  </AppLink>
                  <button
                    class="type-small text-status-busy"
                    type="button"
                    @click="openDeleteDialog(item)"
                  >
                    {{ t('admin.writing.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta && meta.totalPages > 1" class="flex items-center gap-4">
        <AppButton
          :disabled="query.page <= 1"
          variant="secondary"
          @click="query.page = Math.max(1, query.page - 1)"
        >
          {{ t('admin.writing.previous') }}
        </AppButton>
        <p class="type-meta text-ink-muted">
          {{ t('admin.writing.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
        </p>
        <AppButton
          :disabled="query.page >= meta.totalPages"
          variant="secondary"
          @click="query.page = Math.min(meta.totalPages, query.page + 1)"
        >
          {{ t('admin.writing.next') }}
        </AppButton>
      </div>
    </div>

    <Transition name="menu">
      <div
        v-if="pendingDelete"
        ref="dialogRoot"
        aria-labelledby="delete-writing-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDialogKeydown"
      >
        <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 id="delete-writing-title" class="type-h3">{{ t('admin.writing.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.writing.deleteBody', { title: pendingDelete.title, slug: pendingDelete.slug }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.writing.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton ref="confirmButton" :disabled="isDeleting" variant="primary" @click="confirmDelete">
              {{ isDeleting ? t('admin.writing.deleting') : t('admin.writing.deleteConfirm') }}
            </AppButton>
            <AppButton variant="secondary" @click="closeDeleteDialog">
              {{ t('admin.writing.deleteCancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
