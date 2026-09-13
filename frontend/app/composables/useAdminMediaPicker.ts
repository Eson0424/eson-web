import type { AdminMediaItem } from '~/services/admin-media.service'
import { MEDIA_PAGE_SIZE } from '~/utils/media'
import {
  normalizeSelection,
  selectOnly,
  toggleSelection,
} from '~/utils/media-selection'

export type MediaPickerMode = 'single' | 'multiple'

/**
 * MediaPicker 的列表 + 草稿选择状态（Phase 4-F.5）。
 *
 * - 列表复用 Admin 内容列表逻辑（只有分页，没有 search / sort / filter）
 * - 选择只写进 `draftIds`，Confirm 时由父表单决定如何落库（Picker 不碰任何 CMS API）
 */
export function useAdminMediaPicker(options: {
  /** useAsyncData key 后缀：同一页面上的 cover / gallery 两个 Picker 必须互不共享 */
  scope: string
  mode: MediaPickerMode
  selectedIds: readonly string[]
}) {
  const list = useAdminContentList<AdminMediaItem, AdminMediaItem>({
    key: `admin-media-picker-${options.scope}`,
    resource: useAdminMediaService(),
    // Media API 不接受 status / featured / sort / order
    filters: { status: false, featured: false },
    sendSort: false,
    defaultPageSize: MEDIA_PAGE_SIZE,
  })

  const draftIds = ref<string[]>(normalizeSelection(options.selectedIds))

  function isSelected(id: string): boolean {
    return draftIds.value.includes(id)
  }

  function toggle(id: string) {
    draftIds.value =
      options.mode === 'single'
        ? selectOnly(draftIds.value, id)
        : toggleSelection(draftIds.value, id)
  }

  const selectedCount = computed(() => draftIds.value.length)
  // 单选必须恰好 1 个；多选允许空（表示清空 gallery）
  const canConfirm = computed(() => options.mode === 'multiple' || selectedCount.value === 1)

  /** 当前页已选中的条目（用于把详情回填给父表单的缓存） */
  function selectedItems(): AdminMediaItem[] {
    const items = list.items.value

    return draftIds.value
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is AdminMediaItem => Boolean(item))
  }

  return {
    ...list,
    draftIds,
    isSelected,
    toggle,
    selectedCount,
    canConfirm,
    selectedItems,
  }
}
