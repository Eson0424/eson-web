import { describe, expect, it } from 'vitest'
import enUS from '../../i18n/locales/en-US.json'
import zhCN from '../../i18n/locales/zh-CN.json'
import packageJson from '../../package.json'

// Phase 1 只验证工程骨架约定，不测试尚未实现的业务功能。

const REQUIRED_DEPENDENCIES = [
  '@nuxtjs/i18n',
  '@pinia/nuxt',
  'gsap',
  'lenis',
  'nuxt',
  'pinia',
  'vue',
]

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

describe('i18n locales', () => {
  it('ships exactly the approved locale files', () => {
    expect(Object.keys(zhCN)).toContain('app')
    expect(Object.keys(enUS)).toContain('app')
  })

  it('keeps zh-CN and en-US key structures in sync', () => {
    expect(collectKeys(zhCN).sort()).toEqual(collectKeys(enUS).sort())
  })
})

describe('frontend stack', () => {
  it('declares the approved runtime dependencies', () => {
    expect(Object.keys(packageJson.dependencies)).toEqual(
      expect.arrayContaining(REQUIRED_DEPENDENCIES),
    )
  })

  it('declares typescript and tailwindcss as dev dependencies', () => {
    expect(Object.keys(packageJson.devDependencies)).toEqual(
      expect.arrayContaining(['tailwindcss', 'typescript', 'vitest']),
    )
  })
})
