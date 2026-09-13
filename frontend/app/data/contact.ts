import type { ContactChannel, ContactContent, ContactFieldConfig } from '../types/contact'

/**
 * Contact 页面内容（Phase 2C-3）。
 *
 * ⚠️ 本阶段没有真实联系方式：
 * - Email / GitHub / LinkedIn 的 value 与 href 均为 undefined，页面显示“待配置”状态
 * - 表单只做 UI 与校验，不调用任何接口（未来接入 POST /api/v1/contact，docs/API.md §17）
 */

/** 未来接入的联系接口（docs/API.md §17） */
export const CONTACT_ENDPOINT = '/api/v1/contact'

/** 前端 UX 规则：消息至少 20 个字符；API 侧范围为 1–5000（docs/API.md §17） */
export const CONTACT_MESSAGE_MIN_LENGTH = 20

/** 字段约束来自 docs/API.md §17：name 1–100、email 合法、subject 1–200、message 1–5000 */
export const CONTACT_FIELDS: ContactFieldConfig[] = [
  { id: 'name', type: 'text', required: true, autocomplete: 'name', maxLength: 100 },
  { id: 'email', type: 'email', required: true, autocomplete: 'email', maxLength: 254 },
  { id: 'subject', type: 'text', required: true, autocomplete: 'off', maxLength: 200 },
  { id: 'message', type: 'textarea', required: true, autocomplete: 'off', maxLength: 5000 },
]

/** 渠道类型支持 'other'，当前只保留三项；没有真实地址时不构造 value / href */
const CHANNELS: ContactChannel[] = [
  { id: 'email', label: 'Email' },
  { id: 'github', label: 'GitHub' },
  { id: 'linkedin', label: 'LinkedIn' },
]

const EN: ContactContent = {
  hero: {
    kicker: 'Contact',
    headline: ["Let's build", 'something', 'together.'],
    lead: 'Have an idea, a product or a problem worth solving? Tell me what you are working on. This form is implemented and validated; the delivery API is connected in the next phase.',
  },
  methods: {
    title: 'Contact methods',
    lede: 'Direct channels. They are shown as unconfigured until the real addresses exist — no placeholder links are provided.',
    channels: CHANNELS,
  },
  form: {
    title: 'Send a message',
    lede: 'All fields are required. Submissions are stored in the contact inbox via POST /api/v1/contact.',
    fields: CONTACT_FIELDS,
    submitLabel: 'Review message',
  },
  integrationNote:
    'Submissions are written to the contact inbox (POST /api/v1/contact). Email notifications are not part of this phase.',
}

const ZH: ContactContent = {
  hero: {
    kicker: '联系',
    headline: ['一起构建', '一些真正', '有用的东西。'],
    lead: '如果你有想法、产品，或者一个值得解决的问题，欢迎告诉我你正在做什么。这个表单已经实现并带校验；真正的发送接口会在下一阶段接入。',
  },
  methods: {
    title: '联系方式',
    lede: '直接联系渠道。在真实地址就绪之前，它们会以“待配置”状态显示——不会提供任何占位链接。',
    channels: CHANNELS,
  },
  form: {
    title: '发送消息',
    lede: '所有字段都必填。提交后会通过 POST /api/v1/contact 写入联系收件箱。',
    fields: CONTACT_FIELDS,
    submitLabel: '检查内容',
  },
  integrationNote:
    '提交内容会写入联系收件箱（POST /api/v1/contact）。本阶段不包含邮件通知。',
}

export const CONTACT_CONTENT: Record<'zh-CN' | 'en-US', ContactContent> = {
  'zh-CN': ZH,
  'en-US': EN,
}
