<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import type { MediaPickerMode } from '~/composables/useAdminMediaPicker'

const { scope, mode, selectedIds, title } = defineProps<{
  /** 同一页面上的 cover / gallery Picker 必须使用不同 scope（useAsyncData key） */
  scope: string
  mode: MediaPickerMode
  selectedIds: string[]
  title: string
}>()

const emit = defineEmits<{
  confirm: [payload: { ids: string[]; items: AdminMediaItem[] }]
  close: []
}>()

const { t } = useI18n()

const { query, items, meta, status, refresh, draftIds, toggle, selectedCount, canConfirm, selectedItems } =
  useAdminMediaPicker({ scope, mode, selectedIds })

const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

onMounted(async () => {
  rememberTrigger()
  // 监听挂在 document 上：网格里的控件被禁用/替换时焦点可能落到 body，此时 Escape 仍要生效。
  document.addEventListener('keydown', handleKeydown, true)
  await nextTick()
  // 焦点先落在对话框容器（tabindex=-1）：读屏会朗读对话框，Tab 再进入第一个媒体项
  dialogRoot.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown, true)
  restoreTrigger()
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }

  trapFocus(event)
}

function confirm() {
  if (!canConfirm.value) {
    return
  }

  emit('confirm', { ids: [...draftIds.value], items: selectedItems() })
}
</script>

<template>
  <div
    ref="dialogRoot"
    aria-labelledby="media-picker-title"
    aria-modal="true"
    class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-4 tablet:p-6"
    role="dialog"
    tabindex="-1"
  >
    <div class="flex max-h-[90dvh] w-full max-w-3xl flex-col gap-5 rounded-md border border-line bg-surface p-5 tablet:p-6">
      <div class="flex flex-col gap-1">
        <h2 id="media-picker-title" class="type-h3">{{ title }}</h2>
        <p class="type-meta text-ink-muted">
          {{ t('admin.media.picker.subtitle') }}
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto pr-1">
        <LoadingState v-if="status === 'pending'" :message="t('admin.media.loading')" />

        <ErrorState
          v-else-if="status === 'error'"
          :hint="t('states.errorHint')"
          :message="t('admin.media.loadError')"
          :retry-label="t('states.retry')"
          @retry="refresh()"
        />

        <EmptyState
          v-else-if="items.length === 0"
          :hint="t('admin.media.emptyHint')"
          :message="t('admin.media.empty')"
        />

        <MediaPickerGrid
          v-else
          :items="items"
          :mode="mode"
          :selected-ids="draftIds"
          @toggle="toggle"
        />
      </div>

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

      <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p aria-live="polite" class="type-meta text-ink-secondary">
          {{ t('admin.media.picker.selectedCount', { count: selectedCount }) }}
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <AppButton variant="primary" :disabled="!canConfirm" @click="confirm">
            {{ t('admin.media.picker.confirm') }}
          </AppButton>
          <AppButton variant="secondary" @click="emit('close')">
            {{ t('admin.media.cancel') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
