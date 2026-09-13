import {
  contentTranslationSummary,
  hasContentFormErrors,
  toContentPayload,
  validateContentForm,
  type ContentFormState,
} from '~/utils/content-form'
import type { AdminContentListItem, AdminContentResource } from '~/services/admin-content.service'
import type { AppLocale } from '~/types/locale'

/** 翻译完成度：用于 Translation Missing 指示（Experience 也复用同一结构） */
export interface AdminTranslationStatus {
  'zh-CN': boolean
  'en-US': boolean
  missing: AppLocale[]
}

export interface AdminContentEditorOptions<
  TDetail,
  TForm extends object = ContentFormState,
  TListItem = AdminContentListItem,
> {
  resource: AdminContentResource<TDetail, TListItem>
  id?: string
  /** 由调用方创建，保证 Work / Lab 各自的初始表单结构 */
  form: TForm
  fromDetail: (detail: TDetail) => TForm
  toPayload: (form: TForm) => Record<string, unknown>
  /** 表单校验：默认使用共享 content-form 规则（Experience 注入自己的规则） */
  validate?: (form: TForm) => { valid: boolean; errorKey?: string | null }
  /** 翻译完成度：默认使用共享 summary（Experience 注入自己的规则） */
  translationStatus?: (form: TForm) => AdminTranslationStatus
}

/**
 * Admin 内容编辑器共享状态：加载 / 保存 / 删除 / 脏状态。
 * 只通过 service → API 访问数据；组件不直接 fetch（AGENTS §11）。
 */
export function useAdminContentEditor<
  TDetail,
  TForm extends object = ContentFormState,
  TListItem = AdminContentListItem,
>(
  options: AdminContentEditorOptions<TDetail, TForm, TListItem>,
) {
  const auth = useAuthStore()
  const service = options.resource
  const form = options.form
  const baseline = ref(JSON.stringify(form))
  const isLoading = ref(Boolean(options.id))
  const isSaving = ref(false)
  const loadError = ref<string | null>(null)
  const saveError = ref<string | null>(null)
  const saveSuccess = ref(false)

  // 与共享 isContentFormDirty 相同的语义，但适用于任意表单结构（Experience 也复用）
  const isDirty = computed(() => baseline.value !== JSON.stringify(form))
  const translationStatus = computed(
    () =>
      options.translationStatus?.(form) ??
      contentTranslationSummary(form as unknown as ContentFormState),
  )

  function replaceForm(next: TForm) {
    Object.assign(form, next)
  }

  function markClean() {
    baseline.value = JSON.stringify(form)
  }

  async function load() {
    if (!options.id) {
      return
    }

    const token = auth.accessToken

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    isLoading.value = true
    loadError.value = null

    try {
      const detail = await service.detail(token, options.id)
      replaceForm(options.fromDetail(detail))
      markClean()
    } catch (requestError) {
      loadError.value = (requestError as { status?: number })?.status === 404 ? 'not-found' : 'load-failed'
    } finally {
      isLoading.value = false
    }
  }

  async function save(): Promise<boolean> {
    const token = auth.accessToken

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const validation =
      options.validate?.(form) ??
      (() => {
        const errors = validateContentForm(form as unknown as ContentFormState)

        return {
          valid: !hasContentFormErrors(errors),
          errorKey: errors.slug ?? errors.urls ?? 'validation',
        }
      })()

    if (!validation.valid) {
      saveError.value = validation.errorKey ?? 'validation'
      return false
    }

    isSaving.value = true
    saveError.value = null
    saveSuccess.value = false

    try {
      const payload = options.toPayload(form) ?? toContentPayload(form as unknown as ContentFormState)

      if (options.id) {
        await service.update(token, options.id, payload)
      } else {
        await service.create(token, payload)
      }

      markClean()
      saveSuccess.value = true

      return true
    } catch (requestError) {
      const status =
        (requestError as { statusCode?: number })?.statusCode ??
        (requestError as { status?: number })?.status
      const code = (requestError as { data?: { error?: { code?: string } } })?.data?.error?.code

      saveError.value = status === 409 || code === 'CONFLICT' ? 'slug-conflict' : 'save-failed'

      return false
    } finally {
      isSaving.value = false
    }
  }

  async function remove(): Promise<boolean> {
    const token = auth.accessToken

    if (!token || !options.id) {
      return false
    }

    try {
      await service.remove(token, options.id)
      return true
    } catch {
      return false
    }
  }

  return {
    form,
    isLoading,
    isSaving,
    loadError,
    saveError,
    saveSuccess,
    isDirty,
    translationStatus,
    load,
    save,
    remove,
    markClean,
  }
}
