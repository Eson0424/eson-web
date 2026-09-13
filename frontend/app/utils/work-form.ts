import {
  CONTENT_SLUG_PATTERN,
  contentTranslationSummary,
  createEmptyContentForm,
  fromContentDetail,
  hasContentFormErrors,
  isContentFormDirty,
  toContentPayload,
  validateContentForm,
  type AdminContentDetailLike,
  type ContentFormErrors,
  type ContentFormState,
  type ContentStatusValue,
  type ContentTranslationForm,
} from './content-form'

/**
 * Work 表单：字段与公共内容表单一致，额外带 startDate / endDate。
 * 共享逻辑在 `content-form.ts`，这里只保留 Work 特有的部分（AGENTS §29）。
 */

export type WorkStatus = ContentStatusValue
export type WorkTranslationForm = ContentTranslationForm
export type WorkFormState = ContentFormState
export type WorkFormErrors = ContentFormErrors
export type AdminWorkDetailLike = AdminContentDetailLike

export const WORK_SLUG_PATTERN = CONTENT_SLUG_PATTERN

export function createEmptyWorkForm(): WorkFormState {
  return { ...createEmptyContentForm(), startDate: '', endDate: '' }
}

export const validateWorkForm = validateContentForm
export const hasWorkFormErrors = hasContentFormErrors
export const isWorkFormDirty = isContentFormDirty

export function translationSummary(form: WorkFormState) {
  return contentTranslationSummary(form)
}

export function toWorkPayload(form: WorkFormState) {
  return toContentPayload(form, { includeDates: true })
}

export function fromWorkDetail(detail: AdminWorkDetailLike): WorkFormState {
  return fromContentDetail(detail, { includeDates: true })
}
