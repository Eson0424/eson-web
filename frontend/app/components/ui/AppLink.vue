<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const {
  to,
  href,
  external,
  underline = 'collapsed',
  arrow = false,
} = defineProps<{
  to?: RouteLocationRaw
  href?: string
  /** 显式标记外部链接；未提供时按 href 是否为绝对地址判断 */
  external?: boolean
  underline?: 'collapsed' | 'full' | 'none'
  arrow?: boolean
}>()

const { t } = useI18n()

const isExternal = computed(() => {
  if (typeof external === 'boolean') {
    return external
  }

  return Boolean(href && /^https?:\/\//.test(href))
})

const linkClasses = computed(() =>
  cn(
    'inline-flex items-center gap-1.5 text-ink transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:text-accent-text',
    underline !== 'none' && 'link-underline',
  ),
)
</script>

<template>
  <NuxtLink
    v-if="to"
    :class="linkClasses"
    :data-underline="underline === 'collapsed' ? 'collapsed' : undefined"
    :to="to"
  >
    <slot />
    <AppIcon v-if="arrow" decorative size="sm"><slot name="icon">→</slot></AppIcon>
  </NuxtLink>

  <a
    v-else-if="href"
    :class="linkClasses"
    :data-underline="underline === 'collapsed' ? 'collapsed' : undefined"
    :href="href"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    :target="isExternal ? '_blank' : undefined"
  >
    <slot />
    <AppIcon v-if="arrow" decorative size="sm"><slot name="icon">→</slot></AppIcon>
    <span v-if="isExternal" class="sr-only">{{ t('a11y.opensInNewTab') }}</span>
  </a>

  <span v-else :class="linkClasses">
    <slot />
  </span>
</template>
