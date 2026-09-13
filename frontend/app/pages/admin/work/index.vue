<script setup lang="ts">
import type { AdminWorkListItem } from '~/services/admin-work.service'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { query, items, meta, status, error, refresh, removeWork, resetFilters } = useAdminWorkList()

const pendingDelete = ref<AdminWorkListItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref(false)
const confirmButton = useTemplateRef<HTMLButtonElement>('confirmButton')
const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

useSeoMeta({ title: () => `${t('admin.nav.work')} — ESON`, robots: 'noindex, nofollow' })

async function openDeleteDialog(item: AdminWorkListItem) {
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
    await removeWork(pendingDelete.value.id)
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
        <h1 class="type-h3">{{ t('admin.work.listTitle') }}</h1>
        <p class="type-small text-ink-secondary">{{ t('admin.work.listLede') }}</p>
      </div>
      <AppButton :to="'/admin/work/new'" variant="primary">
        {{ t('admin.work.newWork') }}
      </AppButton>
    </div>

    <form class="flex flex-wrap items-end gap-4" @submit.prevent="refresh()">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="filter-search">{{ t('admin.work.search') }}</label>
        <input
          id="filter-search"
          v-model="query.search"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="search"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="filter-status">{{ t('admin.work.filterStatus') }}</label>
        <select
          id="filter-status"
          v-model="query.status"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.work.all') }}</option>
          <option value="DRAFT">{{ t('admin.work.status.draft') }}</option>
          <option value="PUBLISHED">{{ t('admin.work.status.published') }}</option>
          <option value="ARCHIVED">{{ t('admin.work.status.archived') }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="filter-featured">{{ t('admin.work.filterFeatured') }}</label>
        <select
          id="filter-featured"
          v-model="query.featured"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.work.all') }}</option>
          <option value="true">{{ t('admin.work.featuredOnly') }}</option>
          <option value="false">{{ t('admin.work.notFeatured') }}</option>
        </select>
      </div>

      <AppButton type="submit" variant="secondary">{{ t('admin.work.apply') }}</AppButton>
      <AppButton variant="ghost" @click="resetFilters">{{ t('admin.work.reset') }}</AppButton>
    </form>

    <LoadingState v-if="status === 'pending'" :message="t('admin.work.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.work.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="items.length === 0" :message="t('admin.work.empty')" />

    <div v-else class="flex flex-col gap-4">
      <div class="overflow-x-auto rounded-md border border-line">
        <table class="w-full min-w-[52rem] border-collapse text-left">
          <caption class="sr-only">{{ t('admin.work.listTitle') }}</caption>
          <thead class="bg-surface/60">
            <tr>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.title') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.slug') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.status') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.featured') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.locales') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.taxonomy') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.updatedAt') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.work.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-t border-line">
              <td class="type-small px-4 py-3 text-ink">{{ item.title }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.slug }}</td>
              <td class="px-4 py-3">
                <AppBadge :tone="item.status === 'PUBLISHED' ? 'accent' : 'outline'" uppercase>
                  {{ t(`admin.work.status.${item.status.toLowerCase()}`) }}
                </AppBadge>
              </td>
              <td class="type-small px-4 py-3 text-ink-secondary">
                {{ item.featured ? t('admin.work.yes') : t('admin.work.no') }}
              </td>
              <td class="px-4 py-3">
                <span class="type-meta text-ink-secondary">
                  zh-CN: {{ item.translationStatus['zh-CN'] ? t('admin.work.translated') : t('admin.work.missing') }}
                </span>
                <span class="type-meta ml-3 text-ink-secondary">
                  en-US: {{ item.translationStatus['en-US'] ? t('admin.work.translated') : t('admin.work.missing') }}
                </span>
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">
                {{ [...item.categories, ...item.tags].map((entry) => entry.name).join(', ') }}
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.updatedAt.slice(0, 10) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-4">
                  <AppLink :to="`/admin/work/${item.id}/edit`" class="type-small">
                    {{ t('admin.work.edit') }}
                  </AppLink>
                  <button
                    class="type-small text-status-busy"
                    type="button"
                    @click="openDeleteDialog(item)"
                  >
                    {{ t('admin.work.delete') }}
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
          {{ t('admin.work.previous') }}
        </AppButton>
        <p class="type-meta text-ink-muted">
          {{ t('admin.work.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
        </p>
        <AppButton
          :disabled="query.page >= meta.totalPages"
          variant="secondary"
          @click="query.page = Math.min(meta.totalPages, query.page + 1)"
        >
          {{ t('admin.work.next') }}
        </AppButton>
      </div>
    </div>

    <Transition name="menu">
      <div
        v-if="pendingDelete"
        ref="dialogRoot"
        aria-labelledby="delete-work-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDialogKeydown"
      >
        <div
          class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6"
        >
          <h2 id="delete-work-title" class="type-h3">{{ t('admin.work.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.work.deleteBody', { title: pendingDelete.title, slug: pendingDelete.slug }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.work.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton ref="confirmButton" :disabled="isDeleting" variant="primary" @click="confirmDelete">
              {{ isDeleting ? t('admin.work.deleting') : t('admin.work.deleteConfirm') }}
            </AppButton>
            <AppButton variant="secondary" @click="closeDeleteDialog">
              {{ t('admin.work.deleteCancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
