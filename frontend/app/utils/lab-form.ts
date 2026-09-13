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
 * Lab 表单：字段与公共内容表单一致（labs 表没有 start / end date）。
 * 共享逻辑在 `content-form.ts`。
 */

export type LabStatus = ContentStatusValue
export type LabTranslationForm = ContentTranslationForm
export type LabFormState = ContentFormState
export type LabFormErrors = ContentFormErrors
export type AdminLabDetailLike = AdminContentDetailLike

export const LAB_SLUG_PATTERN = CONTENT_SLUG_PATTERN

export function createEmptyLabForm(): LabFormState {
  return createEmptyContentForm()
}

export const validateLabForm = validateContentForm
export const hasLabFormErrors = hasContentFormErrors
export const isLabFormDirty = isContentFormDirty

export function labTranslationSummary(form: LabFormState) {
  return contentTranslationSummary(form)
}

export function toLabPayload(form: LabFormState) {
  return toContentPayload(form)
}

export function fromLabDetail(detail: AdminLabDetailLike): LabFormState {
  return fromContentDetail(detail)
}
