<script setup lang="ts">
import { ACCEPTED_MEDIA_ACCEPT, validateMediaFile } from '~/utils/media'

const { isUploading = false, errorKey = null, success = false } = defineProps<{
  isUploading?: boolean
  errorKey?: string | null
  success?: boolean
}>()

const emit = defineEmits<{
  upload: [payload: { file: File; alt: string }]
}>()

const { t } = useI18n()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const selectedFile = ref<File | null>(null)
const alt = ref('')
const clientErrorKey = ref<string | null>(null)

function resetForm() {
  selectedFile.value = null
  alt.value = ''
  clientErrorKey.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  selectedFile.value = file
  clientErrorKey.value = null

  if (!file) {
    return
  }

  const validation = validateMediaFile(file)

  if (!validation.ok) {
    clientErrorKey.value = validation.reasonKey
  }
}

function submit() {
  const validation = validateMediaFile(selectedFile.value)

  if (!validation.ok) {
    clientErrorKey.value = validation.reasonKey
    return
  }

  emit('upload', { file: selectedFile.value as File, alt: alt.value })
}

// 上传成功后清空表单（由父级 uploadSuccess 驱动）
watch(
  () => success,
  (value) => {
    if (value) {
      resetForm()
    }
  },
)
</script>

<template>
  <section class="flex flex-col gap-5 rounded-md border border-line bg-surface/40 p-6">
    <div class="flex flex-col gap-1">
      <h2 class="type-h3">{{ t('admin.media.uploadTitle') }}</h2>
      <p class="type-small text-ink-secondary">{{ t('admin.media.uploadHint') }}</p>
    </div>

    <div class="flex flex-col gap-4 tablet:flex-row tablet:items-end">
      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="media-file">{{ t('admin.media.fileLabel') }}</label>
        <input
          id="media-file"
          ref="fileInput"
          :accept="ACCEPTED_MEDIA_ACCEPT"
          class="type-small text-ink-secondary file:mr-3 file:rounded-sm file:border file:border-line file:bg-background-secondary file:px-3 file:py-2 file:text-small file:text-ink"
          :disabled="isUploading"
          type="file"
          @change="handleFileChange"
        >
      </div>

      <div class="flex flex-col gap-2">
        <label class="type-meta text-ink-secondary" for="media-alt">{{ t('admin.media.altLabel') }}</label>
        <input
          id="media-alt"
          v-model="alt"
          class="min-h-11 rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
          :disabled="isUploading"
          maxlength="500"
          type="text"
        >
      </div>

      <AppButton
        :disabled="isUploading || !selectedFile || Boolean(clientErrorKey)"
        variant="primary"
        @click="submit"
      >
        {{ isUploading ? t('admin.media.uploading') : t('admin.media.uploadAction') }}
      </AppButton>
    </div>

    <p v-if="clientErrorKey" class="type-small text-status-busy" role="alert">
      <span aria-hidden="true" class="mr-2">!</span>{{ t(clientErrorKey) }}
    </p>

    <p v-else-if="errorKey" class="type-small text-status-busy" role="alert">
      <span aria-hidden="true" class="mr-2">!</span>{{ t(errorKey) }}
    </p>

    <p v-else-if="success" class="type-small text-ink" role="status">
      <span aria-hidden="true" class="mr-2">✓</span>{{ t('admin.media.uploadSuccess') }}
    </p>
  </section>
</template>
