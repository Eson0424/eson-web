<script setup lang="ts">
import { NuxtLink } from '#components'
import type { RouteLocationRaw } from 'vue-router'

const {
  variant = 'secondary',
  size = 'md',
  to,
  href,
  type = 'button',
  disabled = false,
  loading = false,
  block = false,
  external = false,
} = defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'text'
  size?: 'sm' | 'md' | 'lg'
  /** 内部路由链接 */
  to?: RouteLocationRaw
  /** 外部链接 */
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  external?: boolean
}>()

const VARIANT_CLASSES = {
  primary:
    'rounded-sm bg-accent-strong text-white hover:bg-accent-bright active:bg-accent-strong',
  secondary:
    'rounded-sm border border-line-strong bg-transparent text-ink hover:border-ink-muted hover:bg-surface active:bg-surface-elevated',
  ghost: 'rounded-sm text-ink-secondary hover:text-ink',
  text: 'text-ink hover:text-accent-text',
} as const

const SIZE_CLASSES = {
  sm: 'min-h-8 gap-1.5 px-3 text-small',
  md: 'min-h-11 gap-2 px-4 text-small',
  lg: 'min-h-12 gap-2.5 px-5 text-body',
} as const

const isInactive = computed(() => disabled || loading)
const isButton = computed(() => !to && !href)

const buttonClasses = computed(() =>
  cn(
    'inline-flex items-center justify-center font-medium transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)]',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    variant === 'text' && 'px-0',
    block && 'w-full',
    isInactive.value && 'pointer-events-none opacity-50',
  ),
)

const tag = computed(() => {
  if (to && !isInactive.value) {
    return NuxtLink
  }

  return href ? 'a' : 'button'
})

// 对话框等场景需要把焦点交给按钮本身：对外暴露 focus()，避免调用方拿到组件实例后直接调用 DOM 方法。
const rootRef = useTemplateRef<HTMLElement>('root')

defineExpose({
  focus: () => {
    const element = rootRef.value as (HTMLElement & { $el?: HTMLElement }) | null

    if (typeof element?.focus === 'function') {
      element.focus()
      return
    }

    element?.$el?.focus()
  },
})
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isInactive ? 'true' : undefined"
    :class="buttonClasses"
    :disabled="isButton && isInactive ? true : undefined"
    :href="!to && href ? href : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    :target="external ? '_blank' : undefined"
    :to="to"
    :type="isButton ? type : undefined"
  >
    <slot name="leading" />
    <span :class="cn('inline-flex items-center', loading && 'opacity-70')"><slot /></span>
    <slot name="trailing" />
  </component>
</template>
