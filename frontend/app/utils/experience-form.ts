import { SUPPORTED_LOCALES, type AppLocale } from '~/types/locale'

/**
 * Admin Experience 表单（DATABASE §20–22）。
 *
 * 与 Work / Lab / Writing 的表单不同：没有 slug / status / featured / publishedAt /
 * taxonomy / media，因此这里使用 Experience 自己的字段定义，不复用 content-form。
 */

/** employment_type 取值（DATABASE §22） */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'FREELANCE',
  'CONTRACT',
  'SELF_EMPLOYED',
  'OTHER',
] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export interface ExperienceTranslationForm {
  /** ← ExperienceTranslation.role_name（数据库 NOT NULL） */
  roleName: string
  /** ← ExperienceTranslation.company_name */
  companyName: string
  /** ← ExperienceTranslation.summary */
  summary: string
  /** ← ExperienceTranslation.content */
  content: string
}

export interface ExperienceFormState {
  /** ← Experience.sort_order */
  sortOrder: number
  /** ← Experience.employment_type */
  employmentType: '' | EmploymentType
  /** ← Experience.location */
  location: string
  /** ← Experience.start_date（YYYY-MM-DD） */
  startDate: string
  /** ← Experience.end_date（YYYY-MM-DD；isCurrent 时必须为空） */
  endDate: string
  /** ← Experience.is_current */
  isCurrent: boolean
  translations: Record<AppLocale, ExperienceTranslationForm>
}

export interface ExperienceFormErrors {
  translations?: Partial<Record<AppLocale, string>>
  dates?: string
  employmentType?: string
}

const MAX_ROLE_LENGTH = 200
const MAX_COMPANY_LENGTH = 200
const MAX_SUMMARY_LENGTH = 2000

export function createEmptyExperienceForm(): ExperienceFormState {
  return {
    sortOrder: 0,
    employmentType: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    translations: {
      'zh-CN': { roleName: '', companyName: '', summary: '', content: '' },
      'en-US': { roleName: '', companyName: '', summary: '', content: '' },
    },
  }
}

/** Frontend validation 只是 UX；后端仍会独立校验（AGENTS §27） */
export function validateExperienceForm(form: ExperienceFormState): ExperienceFormErrors {
  const errors: ExperienceFormErrors = {}
  const translationErrors: Partial<Record<AppLocale, string>> = {}

  // zh-CN 是默认语言，必须有职位名称；en-US 允许缺失（Admin 显示 Translation Missing）
  if (form.translations['zh-CN'].roleName.trim().length === 0) {
    translationErrors['zh-CN'] = 'role-required'
  }

  for (const locale of SUPPORTED_LOCALES) {
    const translation = form.translations[locale]

    if (translation.roleName.trim().length > MAX_ROLE_LENGTH) {
      translationErrors[locale] = 'role-too-long'
    } else if (translation.companyName.trim().length > MAX_COMPANY_LENGTH) {
      translationErrors[locale] = 'company-too-long'
    } else if (translation.summary.trim().length > MAX_SUMMARY_LENGTH) {
      translationErrors[locale] = 'summary-too-long'
    }
  }

  if (Object.keys(translationErrors).length > 0) {
    errors.translations = translationErrors
  }

  // isCurrent 与 endDate 互斥（与后端 400 VALIDATION_ERROR 规则一致）
  if (form.isCurrent && form.endDate.length > 0) {
    errors.dates = 'current-with-end-date'
  } else if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.dates = 'invalid-date-range'
  }

  if (
    form.employmentType.length > 0 &&
    !(EMPLOYMENT_TYPES as readonly string[]).includes(form.employmentType)
  ) {
    errors.employmentType = 'invalid-employment-type'
  }

  return errors
}

export function hasExperienceFormErrors(errors: ExperienceFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** 保存失败时展示的最小错误信息 */
export function experienceFormErrorKey(errors: ExperienceFormErrors): string {
  const translationError =
    errors.translations?.['zh-CN'] ?? Object.values(errors.translations ?? {})[0]

  return translationError ?? errors.dates ?? errors.employmentType ?? 'validation'
}

export function experienceTranslationSummary(form: ExperienceFormState) {
  return {
    'zh-CN': form.translations['zh-CN'].roleName.trim().length > 0,
    'en-US': form.translations['en-US'].roleName.trim().length > 0,
    missing: SUPPORTED_LOCALES.filter(
      (locale) => form.translations[locale].roleName.trim().length === 0,
    ),
  }
}

/** 用 type alias（而非 interface）：可以直接赋给 Record<string, unknown> 形式的 API body */
export type ExperiencePayload = {
  sortOrder: number
  employmentType: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  translations: Array<Record<string, unknown>>
}

/** 只发送有 roleName 的翻译；内容（content）按原样提交，不做 trim */
export function toExperiencePayload(form: ExperienceFormState): ExperiencePayload {
  return {
    sortOrder: form.sortOrder,
    employmentType: form.employmentType || null,
    location: form.location.trim() || null,
    startDate: form.startDate || null,
    // isCurrent 与 endDate 互斥：勾选 current 时不提交 endDate
    endDate: form.isCurrent ? null : form.endDate || null,
    isCurrent: form.isCurrent,
    translations: SUPPORTED_LOCALES.filter(
      (locale) => form.translations[locale].roleName.trim().length > 0,
    ).map((locale) => ({
      locale,
      roleName: form.translations[locale].roleName.trim(),
      companyName: form.translations[locale].companyName.trim() || undefined,
      summary: form.translations[locale].summary.trim() || undefined,
      content: form.translations[locale].content || undefined,
    })),
  }
}

export interface AdminExperienceDetailLike {
  id: string
  sortOrder: number
  employmentType: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  translations: Array<{
    locale: string
    roleName: string
    companyName: string | null
    summary: string | null
    content: string | null
  }>
}

export function fromExperienceDetail(detail: AdminExperienceDetailLike): ExperienceFormState {
  const form = createEmptyExperienceForm()

  form.sortOrder = detail.sortOrder
  form.employmentType = (detail.employmentType ?? '') as '' | EmploymentType
  form.location = detail.location ?? ''
  form.startDate = detail.startDate ?? ''
  form.endDate = detail.endDate ?? ''
  form.isCurrent = detail.isCurrent

  for (const translation of detail.translations) {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(translation.locale)) {
      continue
    }

    const locale = translation.locale as AppLocale

    form.translations[locale] = {
      roleName: translation.roleName,
      companyName: translation.companyName ?? '',
      summary: translation.summary ?? '',
      content: translation.content ?? '',
    }
  }

  return form
}

export function isExperienceFormDirty(
  baseline: ExperienceFormState,
  current: ExperienceFormState,
): boolean {
  return JSON.stringify(baseline) !== JSON.stringify(current)
}
