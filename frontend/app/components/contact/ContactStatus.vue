<script setup lang="ts">
import type { ContactFormStatus } from '~/types/contact'

const { status, integrationNote } = defineProps<{
  status: ContactFormStatus
  integrationNote: string
  /** 提交失败时的稳定错误码（来自 API envelope） */
  errorCode?: string | null
}>()

const { t } = useI18n()

const STATUS_CONFIG = {
  idle: { marker: '·', messageKey: 'contact.status.idle' },
  invalid: { marker: '!', messageKey: 'contact.status.invalid' },
  submitting: { marker: '…', messageKey: 'contact.status.submitting' },
  success: { marker: '✓', messageKey: 'contact.status.success' },
  error: { marker: '!', messageKey: 'contact.status.error' },
} as const

const config = computed(() => STATUS_CONFIG[status])
const isAlert = computed(() => status === 'invalid')
</script>

<template>
  <div
    :aria-live="isAlert ? 'assertive' : 'polite'"
    :class="
      cn(
        'flex flex-col gap-2 rounded-md border p-5',
        isAlert ? 'border-status-busy/60 bg-status-busy/5' : 'border-line bg-surface/40',
      )
    "
    :role="isAlert ? 'alert' : 'status'"
  >
    <p class="type-small text-ink">
      <span aria-hidden="true" class="mr-2 text-ink-muted">{{ config.marker }}</span>
      {{ t(config.messageKey) }}
    </p>

    <!-- 集成说明包含接口路径等技术字符串，不能使用会转成大写的 type-meta -->
    <p class="type-small text-ink-muted">{{ integrationNote }}</p>
  </div>
</template>
