import type { Directive } from 'vue'

const REVEAL_CLASS = 'reveal'
const REVEALED_CLASS = 'is-revealed'
const UNSUPPORTED_CLASS = 'is-reveal-unsupported'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type RevealVariant = 'fade' | 'clip'

type RevealBinding = { delay?: number; variant?: RevealVariant } | undefined

type RevealDirective = Directive<HTMLElement, RevealBinding>

const CLIP_VARIANT_CLASS = 'reveal-clip'

/**
 * v-reveal：进入视口时揭示内容（DESIGN §26 Content 350–600ms）。
 * - 仅做一次性揭示，不做滚动视差
 * - prefers-reduced-motion 或无 IntersectionObserver 时直接显示
 * 用法：`<div v-reveal>` / `<div v-reveal="{ delay: 120 }">`
 */
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null
  let supportsObserver = false
  let prefersReducedMotion = true

  const revealDirective: RevealDirective = {
    /**
     * SSR：指令必须存在于服务端渲染，否则 Vue 会在 ssrGetDirectiveProps 中抛错。
     * 服务端不产出任何额外属性，隐藏态只在客户端由 .js-reveal 启用。
     */
    getSSRProps: () => ({}),

    mounted(element, binding) {
      if (!import.meta.client) {
        return
      }

      supportsObserver = typeof IntersectionObserver !== 'undefined'
      prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches

      const variant = binding.value?.variant ?? 'fade'

      element.classList.add(variant === 'clip' ? CLIP_VARIANT_CLASS : REVEAL_CLASS)

      if (binding.value?.delay) {
        element.style.setProperty('--reveal-delay', `${binding.value.delay}ms`)
      }

      if (prefersReducedMotion || !supportsObserver) {
        element.classList.add(UNSUPPORTED_CLASS, REVEALED_CLASS)
        return
      }

      // 首屏已可见的元素直接显示：避免 hydration 后“先隐藏再显示”的闪烁，
      // 也让入场动画只服务于滚动进入视口的真实内容。
      const rect = element.getBoundingClientRect()

      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        element.classList.add(REVEALED_CLASS)
        return
      }

      observer ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue
            }

            entry.target.classList.add(REVEALED_CLASS)
            observer?.unobserve(entry.target)
          }
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
      )

      observer.observe(element)
    },
    unmounted(element) {
      observer?.unobserve(element)
    },
  }

  nuxtApp.vueApp.directive('reveal', revealDirective)

  if (import.meta.client) {
    // 只有确认 JS 可用时才启用隐藏态，避免脚本失败导致内容不可见。
    document.documentElement.classList.add('js-reveal')
  }
})
