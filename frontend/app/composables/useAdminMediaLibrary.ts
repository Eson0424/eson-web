import type { AdminMediaItem } from '~/services/admin-media.service'
import {
  MEDIA_PAGE_SIZE,
  checkMediaPixelLimit,
  mediaDisplayName,
  mediaErrorKey,
  normalizeAltInput,
  readMediaReferences,
  validateMediaFile,
  type MediaReferenceLine,
} from '~/utils/media'

/**
 * Admin Media Library 的页面级状态与动作（Phase 4-F.4）。
 *
 * 数据流：Page → Composable → Service → /api/v1/admin/media。
 * 这里承载全部可测试逻辑（列表 / 上传 / alt 编辑 / 删除 + 对话框状态 + 错误映射），
 * 组件只负责展示与交互。
 */
export function useAdminMediaLibrary() {
  const auth = useAuthStore()
  const service = useAdminMediaService()

  const list = useAdminContentList<AdminMediaItem, AdminMediaItem>({
    key: 'admin-media-library',
    resource: service,
    // Media API 不接受 status / featured / sort / order；分页显式传 24
    filters: { status: false, featured: false },
    sendSort: false,
    defaultPageSize: MEDIA_PAGE_SIZE,
  })

  /* ── 上传 ───────────────────────────────────────────── */
  const isUploading = ref(false)
  const uploadErrorKey = ref<string | null>(null)
  const uploadSuccess = ref(false)

  async function uploadFile(file: File | null | undefined, alt?: string | null): Promise<boolean> {
    // 防重复提交
    if (isUploading.value) {
      return false
    }

    // 必须在任何 await 之前占位：预检本身是异步的，否则双击会绕过守卫发两次请求。
    isUploading.value = true
    uploadErrorKey.value = null
    uploadSuccess.value = false

    try {
      const validation = validateMediaFile(file)

      if (!validation.ok) {
        uploadErrorKey.value = validation.reasonKey
        return false
      }

      const pixelErrorKey = await checkMediaPixelLimit(file as File)

      if (pixelErrorKey) {
        uploadErrorKey.value = pixelErrorKey
        return false
      }

      const token = auth.accessToken

      if (!token) {
        uploadErrorKey.value = 'admin.media.errors.UNAUTHORIZED'
        return false
      }

      await service.upload(token, file as File, alt)
      uploadSuccess.value = true

      // 新图片按 createdAt DESC 排在最前
      list.query.page = 1
      await list.refresh()

      return true
    } catch (error) {
      uploadErrorKey.value = mediaErrorKey(error)
      return false
    } finally {
      isUploading.value = false
    }
  }

  function resetUploadFeedback() {
    uploadErrorKey.value = null
    uploadSuccess.value = false
  }

  /* ── alt 编辑 ───────────────────────────────────────── */
  const editingItem = ref<AdminMediaItem | null>(null)
  const editingAlt = ref('')
  const isSavingAlt = ref(false)
  const altErrorKey = ref<string | null>(null)

  function openAltEditor(item: AdminMediaItem) {
    editingItem.value = item
    editingAlt.value = item.alt ?? ''
    altErrorKey.value = null
  }

  function closeAltEditor() {
    if (isSavingAlt.value) {
      return
    }

    editingItem.value = null
    altErrorKey.value = null
  }

  async function saveAlt(): Promise<boolean> {
    const item = editingItem.value

    if (!item || isSavingAlt.value) {
      return false
    }

    const token = auth.accessToken

    if (!token) {
      altErrorKey.value = 'admin.media.errors.UNAUTHORIZED'
      return false
    }

    isSavingAlt.value = true
    altErrorKey.value = null

    try {
      const updated = await service.updateAlt(token, item.id, normalizeAltInput(editingAlt.value))

      list.replaceItem(updated)
      editingItem.value = null

      return true
    } catch (error) {
      altErrorKey.value = mediaErrorKey(error)
      return false
    } finally {
      isSavingAlt.value = false
    }
  }

  /* ── 删除 ───────────────────────────────────────────── */
  const pendingDelete = ref<AdminMediaItem | null>(null)
  const isDeleting = ref(false)
  const deleteErrorKey = ref<string | null>(null)
  const deleteReferences = ref<MediaReferenceLine[]>([])

  function openDeleteDialog(item: AdminMediaItem) {
    pendingDelete.value = item
    deleteErrorKey.value = null
    deleteReferences.value = []
  }

  function closeDeleteDialog() {
    if (isDeleting.value) {
      return
    }

    pendingDelete.value = null
    deleteErrorKey.value = null
    deleteReferences.value = []
  }

  /**
   * 删除确认：成功后移除当前项；若删除的是本页最后一项且不在第一页，则回到上一页。
   * MEDIA_IN_USE 时展示后端返回的真实引用计数。
   */
  async function confirmDelete(): Promise<boolean> {
    const item = pendingDelete.value

    if (!item || isDeleting.value) {
      return false
    }

    const token = auth.accessToken

    if (!token) {
      deleteErrorKey.value = 'admin.media.errors.UNAUTHORIZED'
      return false
    }

    isDeleting.value = true
    deleteErrorKey.value = null
    deleteReferences.value = []

    try {
      await service.remove(token, item.id)
      pendingDelete.value = null

      if (list.items.value.length <= 1 && list.query.page > 1) {
        list.query.page -= 1
      }

      await list.refresh()

      return true
    } catch (error) {
      deleteErrorKey.value = mediaErrorKey(error)
      deleteReferences.value = readMediaReferences(error)

      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    // 列表
    query: list.query,
    items: list.items,
    meta: list.meta,
    status: list.status,
    error: list.error,
    refresh: list.refresh,
    // 上传
    isUploading,
    uploadErrorKey,
    uploadSuccess,
    uploadFile,
    resetUploadFeedback,
    // alt
    editingItem,
    editingAlt,
    isSavingAlt,
    altErrorKey,
    openAltEditor,
    closeAltEditor,
    saveAlt,
    // 删除
    pendingDelete,
    isDeleting,
    deleteErrorKey,
    deleteReferences,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    // 展示助手
    mediaDisplayName,
  }
}
