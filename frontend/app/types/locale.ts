/** 应用支持的语言（与 nuxt.config.ts 中的 i18n.locales 保持一致）。 */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'
