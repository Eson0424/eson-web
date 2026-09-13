<script setup lang="ts">
import type { AdminLabListItem } from '~/services/admin-lab.service'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { query, items, meta, status, error, refresh, removeLab, resetFilters } = useAdminLabList()

const pendingDelete = ref<AdminLabListItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref(false)
const confirmButton = useTemplateRef<HTMLButtonElement>('confirmButton')
const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

useSeoMeta({ title: () => `${t('admin.nav.lab')} — ESON`, robots: 'noindex, nofollow' })

async function openDeleteDialog(item: AdminLabListItem) {
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
    await removeLab(pendingDelete.value.id)
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
        <h1 class="type-h3">{{ t('admin.lab.listTitle') }}</h1>
        <p class="type-small text-ink-secondary">{{ t('admin.lab.listLede') }}</p>
      </div>
      <AppButton :to="'/admin/lab/new'" variant="primary">
        {{ t('admin.lab.newLab') }}
      </AppButton>
    </div>

    <form class="flex flex-wrap items-end gap-4" @submit.prevent="refresh()">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="lab-filter-search">{{ t('admin.lab.search') }}</label>
        <input
          id="lab-filter-search"
          v-model="query.search"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="search"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="lab-filter-status">{{ t('admin.lab.filterStatus') }}</label>
        <select
          id="lab-filter-status"
          v-model="query.status"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.lab.all') }}</option>
          <option value="DRAFT">{{ t('admin.lab.status.draft') }}</option>
          <option value="PUBLISHED">{{ t('admin.lab.status.published') }}</option>
          <option value="ARCHIVED">{{ t('admin.lab.status.archived') }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="lab-filter-featured">{{ t('admin.lab.filterFeatured') }}</label>
        <select
          id="lab-filter-featured"
          v-model="query.featured"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="">{{ t('admin.lab.all') }}</option>
          <option value="true">{{ t('admin.lab.featuredOnly') }}</option>
          <option value="false">{{ t('admin.lab.notFeatured') }}</option>
        </select>
      </div>

      <AppButton type="submit" variant="secondary">{{ t('admin.lab.apply') }}</AppButton>
      <AppButton variant="ghost" @click="resetFilters">{{ t('admin.lab.reset') }}</AppButton>
    </form>

    <LoadingState v-if="status === 'pending'" :message="t('admin.lab.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.lab.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="items.length === 0" :message="t('admin.lab.empty')" />

    <div v-else class="flex flex-col gap-4">
      <div class="overflow-x-auto rounded-md border border-line">
        <table class="w-full min-w-[52rem] border-collapse text-left">
          <caption class="sr-only">{{ t('admin.lab.listTitle') }}</caption>
          <thead class="bg-surface/60">
            <tr>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.title') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.slug') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.status') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.featured') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.locales') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.taxonomy') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.updatedAt') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.lab.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-t border-line">
              <td class="type-small px-4 py-3 text-ink">{{ item.title }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.slug }}</td>
              <td class="px-4 py-3">
                <AppBadge :tone="item.status === 'PUBLISHED' ? 'accent' : 'outline'" uppercase>
                  {{ t(`admin.lab.status.${item.status.toLowerCase()}`) }}
                </AppBadge>
              </td>
              <td class="type-small px-4 py-3 text-ink-secondary">
                {{ item.featured ? t('admin.lab.yes') : t('admin.lab.no') }}
              </td>
              <td class="px-4 py-3">
                <span class="type-meta text-ink-secondary">
                  zh-CN: {{ item.translationStatus['zh-CN'] ? t('admin.lab.translated') : t('admin.lab.missing') }}
                </span>
                <span class="type-meta ml-3 text-ink-secondary">
                  en-US: {{ item.translationStatus['en-US'] ? t('admin.lab.translated') : t('admin.lab.missing') }}
                </span>
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">
                {{ [...item.categories, ...item.tags].map((entry) => entry.name).join(', ') }}
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.updatedAt.slice(0, 10) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-4">
                  <AppLink :to="`/admin/lab/${item.id}/edit`" class="type-small">
                    {{ t('admin.lab.edit') }}
                  </AppLink>
                  <button
                    class="type-small text-status-busy"
                    type="button"
                    @click="openDeleteDialog(item)"
                  >
                    {{ t('admin.lab.delete') }}
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
          {{ t('admin.lab.previous') }}
        </AppButton>
        <p class="type-meta text-ink-muted">
          {{ t('admin.lab.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
        </p>
        <AppButton
          :disabled="query.page >= meta.totalPages"
          variant="secondary"
          @click="query.page = Math.min(meta.totalPages, query.page + 1)"
        >
          {{ t('admin.lab.next') }}
        </AppButton>
      </div>
    </div>

    <Transition name="menu">
      <div
        v-if="pendingDelete"
        ref="dialogRoot"
        aria-labelledby="delete-lab-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDialogKeydown"
      >
        <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 id="delete-lab-title" class="type-h3">{{ t('admin.lab.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.lab.deleteBody', { title: pendingDelete.title, slug: pendingDelete.slug }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.lab.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton ref="confirmButton" :disabled="isDeleting" variant="primary" @click="confirmDelete">
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
