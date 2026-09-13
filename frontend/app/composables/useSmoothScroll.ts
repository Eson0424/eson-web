import Lenis from 'lenis'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DEFAULT_DURATION_S = 1.05

/**
 * 可选的平滑滚动（DESIGN §25），按页面启用，默认不接管原生滚动。
 *
 * 为什么不做成全局插件：Lenis 会接管滚动位置，导致浏览器原生跳转失效
 * —— skip link、锚点跳转、find-in-page、前进/后退滚动恢复都会被打断。
 * 因此只有在需要滚动联动动效的页面（Hero / Lab / Experimental）才手动启用。
 *
 * 启用方式：在页面组件中调用 `useSmoothScroll()`。
 * prefers-reduced-motion 开启时不启动，原生滚动始终可用。
 */
export function useSmoothScroll() {
  const prefersReducedMotion = ref(false)
  const isActive = ref(false)

  let lenis: Lenis | null = null
  let frame = 0

  const loop = (time: number) => {
    lenis?.raf(time)
    frame = requestAnimationFrame(loop)
  }

  const start = () => {
    if (lenis || prefersReducedMotion.value || !import.meta.client) {
      return
    }

    lenis = new Lenis({
      anchors: true,
      duration: DEFAULT_DURATION_S,
      touchMultiplier: 1.4,
      wheelMultiplier: 1,
    })
    isActive.value = true
    frame = requestAnimationFrame(loop)
  }

  const stop = () => {
    if (frame !== 0) {
      cancelAnimationFrame(frame)
      frame = 0
    }

    lenis?.destroy()
    lenis = null
    isActive.value = false
  }

  const scrollTo = (target: number | string, options?: { offset?: number }) => {
    if (lenis) {
      lenis.scrollTo(target, options)
      return
    }

    // 未启用平滑滚动时回退到原生行为，保证功能一致。
    if (typeof target === 'number') {
      window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'auto' })
      return
    }

    document.querySelector(target)?.scrollIntoView({ behavior: 'auto' })
  }

  if (import.meta.client) {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    prefersReducedMotion.value = mediaQuery.matches

    const handleChange = () => {
      if (mediaQuery.matches) {
        stop()
        return
      }

      start()
    }

    onMounted(start)

    onScopeDispose(() => {
      mediaQuery.removeEventListener('change', handleChange)
      stop()
    })

    mediaQuery.addEventListener('change', handleChange)
  }

  return { isActive, scrollTo }
}
