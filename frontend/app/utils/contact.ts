import { CONTACT_FIELDS, CONTACT_MESSAGE_MIN_LENGTH } from '../data/contact'
import type {
  ContactFieldConfig,
  ContactFieldErrors,
  ContactFormValues,
} from '../types/contact'

/** 基础邮箱格式校验；服务端仍必须独立校验（AGENTS §27） */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * 前端表单校验：返回字段级错误码，由组件映射为 i18n 文案。
 * 约束与 docs/API.md §17 保持一致，message 额外要求最小长度作为 UX 规则。
 */
export function validateContactForm(
  values: ContactFormValues,
  fields: ContactFieldConfig[] = CONTACT_FIELDS,
): ContactFieldErrors {
  const errors: ContactFieldErrors = {}

  for (const field of fields) {
    const value = (values[field.id] ?? '').trim()

    if (value.length === 0) {
      if (field.required) {
        errors[field.id] = 'required'
      }

      continue
    }

    if (value.length > field.maxLength) {
      errors[field.id] = 'too-long'
      continue
    }

    if (field.id === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field.id] = 'invalid-email'
      continue
    }

    if (field.id === 'message' && value.length < CONTACT_MESSAGE_MIN_LENGTH) {
      errors[field.id] = 'too-short'
    }
  }

  return errors
}

export function hasContactErrors(errors: ContactFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function createEmptyContactForm(): ContactFormValues {
  return { name: '', email: '', subject: '', message: '' }
}
