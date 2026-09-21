import { describe, expect, it } from 'vitest'
import enUS from '../../i18n/locales/en-US.json'
import zhCN from '../../i18n/locales/zh-CN.json'
import { isPublicEmploymentTypeVisible } from '../../app/utils/experience-display'
import { EMPLOYMENT_TYPES } from '../../app/utils/experience-form'

// P1-2：Public Experience 页面不得直接显示数据库枚举（FULL_TIME 等）。
// 这里锁定「所有真实存在的 employmentType 都有 Public i18n 映射」这一契约。

const PUBLIC_LABELS: Record<'zh-CN' | 'en-US', Record<string, string>> = {
  'zh-CN': zhCN.experience.employmentTypes,
  'en-US': enUS.experience.employmentTypes,
}

describe('public experience employmentType labels', () => {
  it('maps every employment type that exists in the admin constants', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      for (const type of EMPLOYMENT_TYPES) {
        const label = PUBLIC_LABELS[locale][type]

        expect(label, `${locale}: ${type} must have a public label`).toBeTruthy()
      }
    }
  })

  it('never uses the raw enum value as the visible label', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      for (const type of EMPLOYMENT_TYPES) {
        expect(PUBLIC_LABELS[locale][type], `${locale}: ${type}`).not.toBe(type)
        expect(PUBLIC_LABELS[locale][type], `${locale}: ${type}`).not.toMatch(/^[A-Z_]+$/)
      }
    }
  })

  it('ships the approved wording for the two types currently in use', () => {
    expect(PUBLIC_LABELS['zh-CN'].FULL_TIME).toBe('全职')
    expect(PUBLIC_LABELS['zh-CN'].SELF_EMPLOYED).toBe('独立开发 / 自由职业')
    expect(PUBLIC_LABELS['en-US'].FULL_TIME).toBe('Full-time')
    expect(PUBLIC_LABELS['en-US'].SELF_EMPLOYED).toBe('Independent / Freelance')
  })

  it('keeps the same key set in both locales', () => {
    expect(Object.keys(PUBLIC_LABELS['zh-CN']).sort()).toEqual(
      Object.keys(PUBLIC_LABELS['en-US']).sort(),
    )
  })
})

// P1-2 后续：学历等条目使用 OTHER，Public 层不展示（数据库与 Admin 仍然保留该值）。
describe('public experience employmentType visibility', () => {
  it('hides OTHER so education entries do not read as an employment type', () => {
    expect(isPublicEmploymentTypeVisible('OTHER')).toBe(false)
  })

  it('keeps every other real employment type visible', () => {
    const visible = EMPLOYMENT_TYPES.filter((type) => isPublicEmploymentTypeVisible(type))

    expect(visible.sort()).toEqual(
      EMPLOYMENT_TYPES.filter((type) => type !== 'OTHER').sort(),
    )
  })

  it('hides missing values instead of rendering an empty separator', () => {
    expect(isPublicEmploymentTypeVisible(null)).toBe(false)
    expect(isPublicEmploymentTypeVisible(undefined)).toBe(false)
    expect(isPublicEmploymentTypeVisible('')).toBe(false)
  })
})
