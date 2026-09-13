<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import { mediaDisplayName, type MediaReferenceLine } from '~/utils/media'

const {
  item,
  isDeleting = false,
  errorKey = null,
  references = [],
} = defineProps<{
  item: AdminMediaItem
  isDeleting?: boolean
  errorKey?: string | null
  references?: MediaReferenceLine[]
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()

const { t } = useI18n()

const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const confirmButton = useTemplateRef<HTMLButtonElement>('confirmButton')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

onMounted(async () => {
  // 关闭后把焦点还给打开对话框的“删除”按钮（与 Work / Lab 确认对话框一致）。
  rememberTrigger()
  // 监听挂在 document 上：删除失败时按钮从 disabled 恢复会把焦点丢给 body，
  // 只挂在根节点上的话 Escape 与焦点陷阱都会失效。
  document.addEventListener('keydown', handleKeydown, true)
  await nextTick()
  confirmButton.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown, true)
  restoreTrigger()
})

watch(
  () => isDeleting,
  async (deleting) => {
    if (deleting) {
      return
    }

    await nextTick()

    if (document.activeElement === document.body) {
      confirmButton.value?.focus()
    }
  },
)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }

  trapFocus(event)
}
</script>

<template>
  <div
    ref="dialogRoot"
    aria-labelledby="media-delete-title"
    aria-modal="true"
    class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
    role="dialog"
  >
    <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
      <h2 id="media-delete-title" class="type-h3">{{ t('admin.media.deleteTitle') }}</h2>
      <p class="type-small text-ink-secondary">
        {{ t('admin.media.deleteBody', { name: mediaDisplayName(item) }) }}
      </p>

      <div v-if="references.length > 0" class="flex flex-col gap-2 rounded-sm border border-status-busy/50 bg-status-busy/5 p-4">
        <p class="type-small text-ink">{{ t('admin.media.referencesTitle') }}</p>
        <ul class="flex list-none flex-col gap-1">
          <li v-for="line in references" :key="line.key" class="type-meta text-ink-secondary">
            {{ t(line.key) }}: {{ line.count }}
          </li>
        </ul>
      </div>

      <p v-if="errorKey" class="type-small text-status-busy" role="alert">
        <span aria-hidden="true" class="mr-2">!</span>{{ t(errorKey) }}
      </p>

      <div class="flex flex-wrap items-center gap-4">
        <AppButton ref="confirmButton" :disabled="isDeleting" variant="primary" @click="emit('confirm')">
          {{ isDeleting ? t('admin.media.deleting') : t('admin.media.deleteConfirm') }}
        </AppButton>
        <AppButton variant="secondary" :disabled="isDeleting" @click="emit('close')">
          {{ t('admin.media.cancel') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
