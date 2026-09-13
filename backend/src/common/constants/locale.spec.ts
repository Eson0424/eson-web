import { describe, expect, it } from 'vitest'
import { resolveLocale } from './locale.js'

describe('resolveLocale', () => {
  it('prefers the explicit query locale', () => {
    expect(resolveLocale('en-US', 'zh-CN')).toBe('en-US')
  })

  it('falls back to Accept-Language', () => {
    expect(resolveLocale(undefined, 'en-US,en;q=0.9')).toBe('en-US')
    expect(resolveLocale(undefined, 'zh-CN,zh;q=0.8')).toBe('zh-CN')
    expect(resolveLocale(undefined, 'en')).toBe('en-US')
  })

  it('defaults to zh-CN when nothing is provided or unsupported', () => {
    expect(resolveLocale()).toBe('zh-CN')
    expect(resolveLocale('fr-FR')).toBe('zh-CN')
    expect(resolveLocale(undefined, 'de-DE')).toBe('zh-CN')
  })
})
