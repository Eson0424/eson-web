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
 * 联系渠道。本阶段没有真实 Email / GitHub / LinkedIn 地址，
 * 因此 `value` 与 `href` 均为 undefined，页面显示“待配置”状态而不是伪造链接。
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
  /** 明确的集成状态说明：当前不会发送任何请求 */
  integrationNote: string
}

export type ContactFieldError = 'required' | 'invalid-email' | 'too-short' | 'too-long'

/**
 * 表单状态机（Phase 3：接入真实 API）。
 * success 只在 API 真正写入 contact_messages 后出现（不再有 pending-integration 占位态）。
 */
export type ContactFormStatus = 'idle' | 'invalid' | 'submitting' | 'success' | 'error'

export interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
}

export type ContactFieldErrors = Partial<Record<ContactFieldId, ContactFieldError>>

/** 提交结果：本阶段永远停留在“待接入”状态，不会返回成功。 */
export interface ContactSubmitResult {
  status: 'pending-integration'
  endpoint: string
}
