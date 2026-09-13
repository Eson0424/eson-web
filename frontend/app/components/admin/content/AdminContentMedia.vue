<script setup lang="ts">
import type { AdminMediaItem } from '~/services/admin-media.service'
import type { ContentFormState } from '~/utils/content-form'
import { mediaDisplayName } from '~/utils/media'
import { moveSelection, removeSelection, toSelectedRows } from '~/utils/media-selection'

const form = defineModel<ContentFormState>({ required: true })

const { namespace } = defineProps<{
  namespace: 'work' | 'lab' | 'writing'
}>()

const { t } = useI18n()

const mediaOptions = useAdminMediaOptions()

const showCoverPicker = ref(false)
const showGalleryPicker = ref(false)

const coverItem = computed(() => mediaOptions.byId(form.value.coverMediaId))
const galleryRows = computed(() =>
  toSelectedRows(
    form.value.mediaIds,
    form.value.mediaIds
      .map((id) => mediaOptions.byId(id))
      .filter((item): item is AdminMediaItem => Boolean(item)),
  ),
)

// 打开页面时解析已保存的 cover / gallery；未解析到的行退化为只显示 id（有界回填，见 composable 注释）
onMounted(() => {
  void mediaOptions.ensure([
    ...form.value.mediaIds,
    ...(form.value.coverMediaId ? [form.value.coverMediaId] : []),
  ])
})

function handleCoverConfirm(payload: { ids: string[]; items: AdminMediaItem[] }) {
  mediaOptions.remember(payload.items)
  // 单选：Confirm 时有且仅有 1 个；没有选中则视为不改动（清空走“移除封面”）
  form.value.coverMediaId = payload.ids[0] ?? form.value.coverMediaId
  showCoverPicker.value = false
}

function handleGalleryConfirm(payload: { ids: string[]; items: AdminMediaItem[] }) {
  mediaOptions.remember(payload.items)
  // Confirm = 表单选择整体替换（顺序即 sort_order）
  form.value.mediaIds = payload.ids
  showGalleryPicker.value = false
}

function clearCover() {
  // 清空封面不影响 gallery（Cover 与 Gallery 是两个独立关系）
  form.value.coverMediaId = null
}

function moveGalleryRow(from: number, to: number) {
  form.value.mediaIds = moveSelection(form.value.mediaIds, from, to)
}

function removeGalleryRow(id: string) {
  // 只移除 gallery 关系；不自动清空封面
  form.value.mediaIds = removeSelection(form.value.mediaIds, id)
}
</script>

<template>
  <fieldset class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
    <legend class="type-meta px-2 text-ink-muted">{{ t(`admin.${namespace}.form.media`) }}</legend>

    <p class="type-meta text-ink-muted">{{ t(`admin.${namespace}.form.mediaHint`) }}</p>

    <p v-if="mediaOptions.isLoading.value" class="type-small text-ink-secondary">
      {{ t(`admin.${namespace}.form.loadingOptions`) }}
    </p>

    <!-- 已选媒体详情解析失败不阻塞编辑：关系本身仍然可以保存 -->
    <p v-else-if="mediaOptions.error.value" class="type-small text-status-busy" role="alert">
      <span aria-hidden="true" class="mr-2">!</span>{{ t('admin.media.loadError') }}
    </p>

    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <p class="type-meta text-ink-secondary">{{ t(`admin.${namespace}.form.cover`) }}</p>

        <div v-if="coverItem" class="flex flex-wrap items-center gap-4">
          <img
            :alt="coverItem.alt || mediaDisplayName(coverItem)"
            class="h-16 w-24 rounded-sm border border-line object-cover"
            decoding="async"
            loading="lazy"
            :src="coverItem.url"
          >
          <span class="type-small break-all text-ink">{{ mediaDisplayName(coverItem) }}</span>
          <AppButton size="sm" variant="secondary" @click="showCoverPicker = true">
            {{ t('admin.media.picker.replace') }}
          </AppButton>
          <AppButton size="sm" variant="ghost" @click="clearCover">
            {{ t('admin.media.picker.clear') }}
          </AppButton>
        </div>

        <div v-else class="flex flex-wrap items-center gap-4">
          <p class="type-small text-ink-muted">{{ t(`admin.${namespace}.form.noCover`) }}</p>
          <AppButton size="sm" variant="secondary" @click="showCoverPicker = true">
            {{ t('admin.media.picker.open') }}
          </AppButton>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="type-meta text-ink-secondary">{{ t(`admin.${namespace}.form.gallery`) }}</p>
          <AppButton size="sm" variant="secondary" @click="showGalleryPicker = true">
            {{ t('admin.media.picker.open') }}
          </AppButton>
        </div>

        <p v-if="galleryRows.length === 0" class="type-small text-ink-muted">
          {{ t('admin.media.gallery.empty') }}
        </p>

        <SelectedMediaList
          v-else
          :rows="galleryRows"
          @move="moveGalleryRow"
          @remove="removeGalleryRow"
        />
      </div>
    </div>

    <Transition name="menu">
      <MediaPickerDialog
        v-if="showCoverPicker"
        :scope="`${namespace}-cover`"
        mode="single"
        :selected-ids="form.coverMediaId ? [form.coverMediaId] : []"
        :title="t('admin.media.picker.coverTitle')"
        @close="showCoverPicker = false"
        @confirm="handleCoverConfirm"
      />
    </Transition>

    <Transition name="menu">
      <MediaPickerDialog
        v-if="showGalleryPicker"
        :scope="`${namespace}-gallery`"
        mode="multiple"
        :selected-ids="form.mediaIds"
        :title="t('admin.media.picker.galleryTitle')"
        @close="showGalleryPicker = false"
        @confirm="handleGalleryConfirm"
      />
    </Transition>
  </fieldset>
</template>
