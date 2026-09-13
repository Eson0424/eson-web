<script setup lang="ts">
import type { AdminExperienceListItem } from '~/services/admin-experience.service'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { query, items, meta, status, error, refresh, removeExperience, resetFilters } =
  useAdminExperienceList()

const SORT_FIELDS = ['sortOrder', 'startDate', 'endDate', 'createdAt', 'updatedAt'] as const

const pendingDelete = ref<AdminExperienceListItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref(false)
const confirmButton = useTemplateRef<HTMLButtonElement>('confirmButton')
const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

useSeoMeta({ title: () => `${t('admin.nav.experience')} — ESON`, robots: 'noindex, nofollow' })

function periodLabel(item: AdminExperienceListItem): string {
  const end = item.isCurrent ? t('common.present') : item.endDate
  const parts = [item.startDate, end].filter(Boolean)

  return parts.length > 0 ? parts.join(' — ') : '—'
}

function displayName(item: AdminExperienceListItem): string {
  return item.role || '—'
}

async function openDeleteDialog(item: AdminExperienceListItem) {
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
    await removeExperience(pendingDelete.value.id)
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
        <h1 class="type-h3">{{ t('admin.experience.listTitle') }}</h1>
        <p class="type-small text-ink-secondary">{{ t('admin.experience.listLede') }}</p>
      </div>
      <AppButton :to="'/admin/experience/new'" variant="primary">
        {{ t('admin.experience.newExperience') }}
      </AppButton>
    </div>

    <form class="flex flex-wrap items-end gap-4" @submit.prevent="refresh()">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-filter-search">
          {{ t('admin.experience.search') }}
        </label>
        <input
          id="experience-filter-search"
          v-model="query.search"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          type="search"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-filter-sort">
          {{ t('admin.experience.filterSort') }}
        </label>
        <select
          id="experience-filter-sort"
          v-model="query.sort"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option v-for="field in SORT_FIELDS" :key="field" :value="field">
            {{ t(`admin.experience.sortFields.${field}`) }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="experience-filter-order">
          {{ t('admin.experience.filterOrder') }}
        </label>
        <select
          id="experience-filter-order"
          v-model="query.order"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
        >
          <option value="asc">{{ t('admin.experience.orderAsc') }}</option>
          <option value="desc">{{ t('admin.experience.orderDesc') }}</option>
        </select>
      </div>

      <AppButton type="submit" variant="secondary">{{ t('admin.experience.apply') }}</AppButton>
      <AppButton variant="ghost" @click="resetFilters">{{ t('admin.experience.reset') }}</AppButton>
    </form>

    <LoadingState v-if="status === 'pending'" :message="t('admin.experience.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.experience.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="items.length === 0" :message="t('admin.experience.empty')" />

    <div v-else class="flex flex-col gap-4">
      <div class="overflow-x-auto rounded-md border border-line">
        <table class="w-full min-w-[52rem] border-collapse text-left">
          <caption class="sr-only">{{ t('admin.experience.listTitle') }}</caption>
          <thead class="bg-surface/60">
            <tr>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.role') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.company') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.period') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.current') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.locales') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.sortOrder') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.updatedAt') }}</th>
              <th class="type-meta px-4 py-3 text-ink-muted" scope="col">{{ t('admin.experience.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-t border-line">
              <td class="type-small px-4 py-3 text-ink">{{ displayName(item) }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.company ?? '—' }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ periodLabel(item) }}</td>
              <td class="type-small px-4 py-3 text-ink-secondary">
                {{ item.isCurrent ? t('admin.experience.yes') : t('admin.experience.no') }}
              </td>
              <td class="px-4 py-3">
                <span class="type-meta text-ink-secondary">
                  zh-CN: {{ item.translationStatus['zh-CN'] ? t('admin.experience.translated') : t('admin.experience.missing') }}
                </span>
                <span class="type-meta ml-3 text-ink-secondary">
                  en-US: {{ item.translationStatus['en-US'] ? t('admin.experience.translated') : t('admin.experience.missing') }}
                </span>
              </td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.sortOrder }}</td>
              <td class="type-meta px-4 py-3 text-ink-muted">{{ item.updatedAt.slice(0, 10) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-4">
                  <AppLink :to="`/admin/experience/${item.id}/edit`" class="type-small">
                    {{ t('admin.experience.edit') }}
                  </AppLink>
                  <button
                    class="type-small text-status-busy"
                    type="button"
                    @click="openDeleteDialog(item)"
                  >
                    {{ t('admin.experience.delete') }}
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
          {{ t('admin.experience.previous') }}
        </AppButton>
        <p class="type-meta text-ink-muted">
          {{ t('admin.experience.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
        </p>
        <AppButton
          :disabled="query.page >= meta.totalPages"
          variant="secondary"
          @click="query.page = Math.min(meta.totalPages, query.page + 1)"
        >
          {{ t('admin.experience.next') }}
        </AppButton>
      </div>
    </div>

    <Transition name="menu">
      <div
        v-if="pendingDelete"
        ref="dialogRoot"
        aria-labelledby="delete-experience-title"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
        role="dialog"
        @keydown="handleDialogKeydown"
      >
        <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 id="delete-experience-title" class="type-h3">{{ t('admin.experience.deleteTitle') }}</h2>
          <p class="type-small text-ink-secondary">
            {{ t('admin.experience.deleteBody', { title: displayName(pendingDelete), company: pendingDelete.company ?? '—' }) }}
          </p>
          <p v-if="deleteError" class="type-small text-status-busy" role="alert">
            <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.experience.errors.delete-failed') }}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <AppButton ref="confirmButton" :disabled="isDeleting" variant="primary" @click="confirmDelete">
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
