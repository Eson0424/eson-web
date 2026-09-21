import type { ContactChannel, ContactContent, ContactFieldConfig } from '../types/contact'

/**
 * Contact 页面内容。
 *
 * 正式公开的联系方式只有邮箱：GitHub 与 LinkedIn 均未提供，因此不生成对应渠道，
 * 也不渲染任何空链接（AGENTS §45：不虚构社交账号）。
 * 邮箱在这里定义一次，Footer 与首页 Contact 区块复用同一常量，避免出现多份副本。
 */

/** 正式联系邮箱（唯一公开联系方式） */
export const CONTACT_EMAIL = 'jikang0424@163.com'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

/** 前端 UX 规则：消息至少 20 个字符；API 侧范围为 1–5000（docs/API.md §17） */
export const CONTACT_MESSAGE_MIN_LENGTH = 20

/** 字段约束来自 docs/API.md §17：name 1–100、email 合法、subject 1–200、message 1–5000 */
export const CONTACT_FIELDS: ContactFieldConfig[] = [
  { id: 'name', type: 'text', required: true, autocomplete: 'name', maxLength: 100 },
  { id: 'email', type: 'email', required: true, autocomplete: 'email', maxLength: 254 },
  { id: 'subject', type: 'text', required: true, autocomplete: 'off', maxLength: 200 },
  { id: 'message', type: 'textarea', required: true, autocomplete: 'off', maxLength: 5000 },
]

/** 只声明真实存在的渠道；没有地址的渠道直接不出现，而不是渲染成空链接 */
const CHANNELS: ContactChannel[] = [
  { id: 'email', label: 'Email', value: CONTACT_EMAIL, href: CONTACT_MAILTO },
]

const EN: ContactContent = {
  hero: {
    kicker: 'Contact',
    headline: ["Let's build", 'something', 'together.'],
    lead: 'Have an idea, a product, or a problem worth solving? Tell me what you are working on.',
  },
  methods: {
    title: 'Contact methods',
    lede: 'Email is the direct channel — for project enquiries, collaboration, and questions about the work on this site.',
    channels: CHANNELS,
  },
  form: {
    title: 'Send a message',
    lede: 'All fields are required. Messages arrive in the same inbox as the email address above.',
    fields: CONTACT_FIELDS,
    submitLabel: 'Send message',
  },
  integrationNote:
    'Submissions are delivered to the contact inbox and read directly. No automatic reply is sent.',
}

const ZH: ContactContent = {
  hero: {
    kicker: '联系',
    headline: ['一起构建', '一些真正', '有用的东西。'],
    lead: '如果你有想法、产品，或者一个值得解决的问题，欢迎告诉我你正在做什么。',
  },
  methods: {
    title: '联系方式',
    lede: '邮箱是直接联系渠道，适合项目咨询、合作，以及关于本站内容的交流。',
    channels: CHANNELS,
  },
  form: {
    title: '发送消息',
    lede: '所有字段都必填。提交内容会与上方邮箱进入同一个收件箱。',
    fields: CONTACT_FIELDS,
    submitLabel: '发送',
  },
  integrationNote: '提交内容会进入联系收件箱，由本人直接查看；系统不会自动回复。',
}

export const CONTACT_CONTENT: Record<'zh-CN' | 'en-US', ContactContent> = {
  'zh-CN': ZH,
  'en-US': EN,
}
