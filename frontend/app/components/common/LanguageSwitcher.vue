<script setup lang="ts">
import type { AppLocale } from '~/types/locale'

const { locale, locales, setLocale, t } = useI18n()

// 导航中的短标签（DESIGN §10：中文 / EN）
const SHORT_LABELS: Record<AppLocale, string> = {
  'zh-CN': '中文',
  'en-US': 'EN',
}

const items = computed(() =>
  (locales.value as Array<{ code: AppLocale; name?: string }>).map((item) => ({
    code: item.code,
    label: SHORT_LABELS[item.code] ?? item.name ?? item.code,
  })),
)

function selectLocale(code: AppLocale) {
  void setLocale(code)
}
</script>

<template>
  <div
    :aria-label="t('a11y.languageSwitcherLabel')"
    class="type-meta flex items-center gap-2"
    role="group"
  >
    <template v-for="(item, index) in items" :key="item.code">
      <span v-if="index > 0" aria-hidden="true" class="text-ink-muted">/</span>
      <button
        :aria-pressed="locale === item.code"
        :class="
          cn(
            'transition-colors duration-[var(--duration-micro)] ease-[var(--ease-out)]',
            locale === item.code ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary',
          )
        "
        type="button"
        @click="selectLocale(item.code)"
      >
        {{ item.label }}
      </button>
    </template>
  </div>
</template>
