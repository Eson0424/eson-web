import { describe, expect, it } from 'vitest'
import enUS from '../../i18n/locales/en-US.json'
import zhCN from '../../i18n/locales/zh-CN.json'

// Phase 2D：两种语言必须始终提供同一套 key，避免出现中英混杂或缺失翻译。

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

function collectValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  if (value === null || typeof value !== 'object') {
    return []
  }

  return Object.values(value).flatMap((child) => collectValues(child))
}

describe('i18n locale parity', () => {
  it('ships exactly the same keys in both locales', () => {
    expect(collectKeys(enUS).sort()).toEqual(collectKeys(zhCN).sort())
  })

  it('has no empty translation values', () => {
    for (const [locale, messages] of Object.entries({ 'zh-CN': zhCN, 'en-US': enUS })) {
      for (const value of collectValues(messages)) {
        expect(value.trim().length, locale).toBeGreaterThan(0)
      }
    }
  })

  it('covers the page-level namespaces used by the public routes', () => {
    const requiredNamespaces = [
      'nav',
      'footer',
      'home',
      'work',
      'lab',
      'writing',
      'experience',
      'about',
      'contact',
      'error',
      'a11y',
      'common',
    ]

    for (const locale of [zhCN, enUS]) {
      for (const namespace of requiredNamespaces) {
        expect(Object.keys(locale)).toContain(namespace)
      }
    }
  })
})
