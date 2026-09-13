import { CONTACT_CONTENT, CONTACT_FIELDS } from '../data/contact'
import { DEFAULT_LOCALE, type AppLocale } from '../types/locale'
import type { ContactContent, ContactFieldConfig } from '../types/contact'

/**
 * Contact 页面内容入口（Phase 2C-3）。
 * 内容（标题、渠道、字段配置）来自数据层；未来接入 POST /api/v1/contact（docs/API.md §17）。
 */
export function useContactContent() {
  const { locale } = useI18n()

  const content = computed<ContactContent>(() => {
    const current = locale.value as AppLocale

    return CONTACT_CONTENT[current] ?? CONTACT_CONTENT[DEFAULT_LOCALE]
  })

  const fields = computed<ContactFieldConfig[]>(() => content.value.form.fields ?? CONTACT_FIELDS)

  return { content, fields }
}
