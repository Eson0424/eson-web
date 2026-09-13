import { ABOUT_CONTENT } from '../data/about'
import { DEFAULT_LOCALE, type AppLocale } from '../types/locale'
import type { AboutContent } from '../types/about'

/**
 * About 页面内容入口（Phase 2C-3）。
 * 语言缺失时回退 zh-CN（AGENTS §9）；未来由 SiteSetting / Person 内容承载。
 */
export function useAboutContent() {
  const { locale } = useI18n()

  const content = computed<AboutContent>(() => {
    const current = locale.value as AppLocale

    return ABOUT_CONTENT[current] ?? ABOUT_CONTENT[DEFAULT_LOCALE]
  })

  return { content }
}
