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
 * Writing 表单：字段与公共内容表单一致，
 * 差别是摘要列为 excerpt（writings 没有 summary），且没有链接与日期字段。
 * 共享逻辑在 `content-form.ts`。
 */

export type WritingStatus = ContentStatusValue
export type WritingTranslationForm = ContentTranslationForm
export type WritingFormState = ContentFormState
export type WritingFormErrors = ContentFormErrors
export type AdminWritingDetailLike = AdminContentDetailLike

export const WRITING_SLUG_PATTERN = CONTENT_SLUG_PATTERN

export function createEmptyWritingForm(): WritingFormState {
  return createEmptyContentForm()
}

export const validateWritingForm = validateContentForm
export const hasWritingFormErrors = hasContentFormErrors
export const isWritingFormDirty = isContentFormDirty

export function writingTranslationSummary(form: WritingFormState) {
  return contentTranslationSummary(form)
}

/** 正文（content）按原样提交：不做 trim，保证 Markdown 语义不被破坏 */
export function toWritingPayload(form: WritingFormState) {
  // writings 表没有 github / demo / project 列，必须完全不发送这些字段
  return toContentPayload(form, { translationField: 'excerpt', includeLinks: false })
}

export function fromWritingDetail(detail: AdminWritingDetailLike): WritingFormState {
  return fromContentDetail(detail, { translationField: 'excerpt' })
}
