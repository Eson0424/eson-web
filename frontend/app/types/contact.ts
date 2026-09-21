export type ContactFieldId = 'name' | 'email' | 'subject' | 'message'

/** 表单字段配置：标签文案来自 i18n，约束来自 docs/API.md §17。 */
export interface ContactFieldConfig {
  id: ContactFieldId
  type: 'text' | 'email' | 'textarea'
  required: boolean
  autocomplete: string
  maxLength: number
}

export type ContactChannelId = 'email' | 'github' | 'linkedin' | 'other'

/**
 * 联系渠道。只声明真实存在的地址：没有地址的渠道不应出现在数据里，
 * 因此 `value` / `href` 为空时页面不会渲染链接（AGENTS §45）。
 */
export interface ContactChannel {
  id: ContactChannelId
  label: string
  value?: string
  href?: string
}

export interface ContactHeroContent {
  kicker: string
  headline: string[]
  lead: string
}

export interface ContactMethodsContent {
  title: string
  lede?: string
  channels: ContactChannel[]
}

export interface ContactFormContent {
  title: string
  lede?: string
  fields: ContactFieldConfig[]
  submitLabel: string
}

export interface ContactContent {
  hero: ContactHeroContent
  methods: ContactMethodsContent
  form: ContactFormContent
  /** 提交后的实际行为说明（不提任何无法保证的回复时限） */
  integrationNote: string
}

export type ContactFieldError = 'required' | 'invalid-email' | 'too-short' | 'too-long'

/**
 * 表单状态机。success 只在 API 真正写入 contact_messages 后出现。
 */
export type ContactFormStatus = 'idle' | 'invalid' | 'submitting' | 'success' | 'error'

export interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
}

export type ContactFieldErrors = Partial<Record<ContactFieldId, ContactFieldError>>
