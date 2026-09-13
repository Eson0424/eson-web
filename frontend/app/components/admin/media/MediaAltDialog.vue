<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import { mediaDisplayName } from '~/utils/media'

const { item, isSaving = false, errorKey = null } = defineProps<{
  item: AdminMediaItem
  isSaving?: boolean
  errorKey?: string | null
}>()

const alt = defineModel<string>('alt', { required: true })

const emit = defineEmits<{
  save: []
  close: []
}>()

const { t } = useI18n()

const dialogRoot = useTemplateRef<HTMLElement>('dialogRoot')
const altInput = useTemplateRef<HTMLInputElement>('altInput')
const { handleKeydown: trapFocus, rememberTrigger, restoreTrigger } = useDialogFocusTrap(
  () => dialogRoot.value,
)

onMounted(async () => {
  // 关闭后把焦点还给打开对话框的“编辑”按钮（与 Work / Lab 确认对话框一致）。
  rememberTrigger()
  // 监听挂在 document 上：保存失败时按钮从 disabled 恢复会把焦点丢给 body，
  // 只挂在根节点上的话 Escape 与焦点陷阱都会失效。
  document.addEventListener('keydown', handleKeydown, true)
  await nextTick()
  altInput.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown, true)
  restoreTrigger()
})

watch(
  () => isSaving,
  async (saving) => {
    if (saving) {
      return
    }

    await nextTick()

    if (document.activeElement === document.body) {
      altInput.value?.focus()
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
    aria-labelledby="media-alt-title"
    aria-modal="true"
    class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/80 p-6"
    role="dialog"
  >
    <div class="flex w-full max-w-md flex-col gap-5 rounded-md border border-line bg-surface p-6">
      <h2 id="media-alt-title" class="type-h3">{{ t('admin.media.editTitle') }}</h2>
      <p class="type-small break-all text-ink-secondary">{{ mediaDisplayName(item) }}</p>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="media-alt-input">
          {{ t('admin.media.altInputLabel') }}
        </label>
        <input
          id="media-alt-input"
          ref="altInput"
          v-model="alt"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          :disabled="isSaving"
          maxlength="500"
          type="text"
        >
        <p class="type-meta text-ink-muted">{{ t('admin.media.altHint') }}</p>
      </div>

      <p v-if="errorKey" class="type-small text-status-busy" role="alert">
        <span aria-hidden="true" class="mr-2">!</span>{{ t(errorKey) }}
      </p>

      <div class="flex flex-wrap items-center gap-4">
        <AppButton :disabled="isSaving" variant="primary" @click="emit('save')">
          {{ isSaving ? t('admin.media.saving') : t('admin.media.save') }}
        </AppButton>
        <AppButton variant="secondary" :disabled="isSaving" @click="emit('close')">
          {{ t('admin.media.cancel') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
