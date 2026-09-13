import { DEFAULT_LOCALE, type SupportedLocale } from '../constants/locale.js'

export interface TranslationLike {
  locale: string
}

export interface PickedTranslation<TTranslation> {
  translation: TTranslation
  /** true 表示当前语言缺失，使用了 zh-CN 回退（Admin 侧必须可见） */
  isFallback: boolean
}

/**
 * 选择翻译：当前 locale → zh-CN fallback（AGENTS §9、DATABASE §67）。
 * 不伪造内容：如果连 zh-CN 都没有，返回 null。
 */
export function pickTranslation<TTranslation extends TranslationLike>(
  translations: TTranslation[],
  locale: SupportedLocale,
): PickedTranslation<TTranslation> | null {
  const exact = translations.find((item) => item.locale === locale)

  if (exact) {
    return { translation: exact, isFallback: false }
  }

  const fallback = translations.find((item) => item.locale === DEFAULT_LOCALE)

  return fallback ? { translation: fallback, isFallback: true } : null
}
