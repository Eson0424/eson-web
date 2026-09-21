import { describe, expect, it } from 'vitest'
import {
  CONTACT_CONTENT,
  CONTACT_EMAIL,
  CONTACT_FIELDS,
  CONTACT_MAILTO,
} from '../../app/data/contact'
import { createEmptyContactForm, validateContactForm } from '../../app/utils/contact'

// Contact 内容与表单契约。
// 重点：形式完整、校验正确、只暴露真实存在的联系方式、页面不残留开发阶段措辞。

const LOCALES = ['zh-CN', 'en-US'] as const

describe('contact content contract', () => {
  it('ships both locales with the same field set', () => {
    for (const locale of LOCALES) {
      const content = CONTACT_CONTENT[locale]

      expect(content.hero.headline.length, locale).toBeGreaterThan(0)
      expect(content.methods.channels.length, locale).toBeGreaterThan(0)
      expect(content.form.fields.map((field) => field.id), locale).toEqual([
        'name',
        'email',
        'subject',
        'message',
      ])
      expect(content.integrationNote.length, locale).toBeGreaterThan(0)
    }
  })

  it('marks every field required with API-aligned limits', () => {
    for (const field of CONTACT_FIELDS) {
      expect(field.required, field.id).toBe(true)
      expect(field.maxLength, field.id).toBeGreaterThan(0)
    }

    expect(CONTACT_FIELDS.find((field) => field.id === 'name')?.maxLength).toBe(100)
    expect(CONTACT_FIELDS.find((field) => field.id === 'subject')?.maxLength).toBe(200)
    expect(CONTACT_FIELDS.find((field) => field.id === 'message')?.maxLength).toBe(5000)
  })

  it('exposes exactly the one real contact channel', () => {
    for (const locale of LOCALES) {
      const channels = CONTACT_CONTENT[locale].methods.channels

      // GitHub / LinkedIn 未提供，因此不允许出现对应渠道（AGENTS §45）
      expect(channels.map((channel) => channel.id), locale).toEqual(['email'])
      expect(channels[0]?.value, locale).toBe(CONTACT_EMAIL)
      expect(channels[0]?.href, locale).toBe(CONTACT_MAILTO)
    }
  })

  it('contains no development-phase wording', () => {
    const forbidden = ['下一阶段', 'next phase', '待配置', 'unconfigured', 'todo', 'placeholder', 'lorem']

    for (const locale of LOCALES) {
      const serialized = JSON.stringify(CONTACT_CONTENT[locale]).toLowerCase()

      for (const phrase of forbidden) {
        expect(serialized, `${locale}: ${phrase}`).not.toContain(phrase)
      }
    }
  })
})

describe('contact form validation', () => {
  it('requires every field', () => {
    const errors = validateContactForm(createEmptyContactForm())

    expect(errors).toEqual({
      name: 'required',
      email: 'required',
      subject: 'required',
      message: 'required',
    })
  })

  it('rejects an invalid email address', () => {
    const errors = validateContactForm({
      name: 'Test',
      email: 'not-an-email',
      subject: 'Hello',
      message: 'This message is definitely long enough.',
    })

    expect(errors.email).toBe('invalid-email')
  })

  it('requires a minimum message length', () => {
    const errors = validateContactForm({
      name: 'Test',
      email: 'test@example.com',
      subject: 'Hello',
      message: 'too short',
    })

    expect(errors.message).toBe('too-short')
  })

  it('accepts a complete, well-formed submission', () => {
    const errors = validateContactForm({
      name: 'Test',
      email: 'test@example.com',
      subject: 'Project enquiry',
      message: 'This message is definitely long enough to pass validation.',
    })

    expect(errors).toEqual({})
  })
})

// Phase 3：提交逻辑已迁移到 app/services/contact.service.ts（POST /api/v1/contact），
// 由 backend e2e 测试覆盖真实写入与限流；此处仅保留表单校验契约。
