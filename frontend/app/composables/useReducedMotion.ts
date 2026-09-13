import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * SSR 安全的 prefers-reduced-motion 状态。
 * 服务端始终返回 false，客户端挂载后同步真实值（DESIGN §27）。
 */
export function useReducedMotion() {
  const prefersReducedMotion = ref(false)

  if (import.meta.client) {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    prefersReducedMotion.value = mediaQuery.matches

    const handleChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion.value = event.matches
    }

    mediaQuery.addEventListener('change', handleChange)

    // 在组件之外（例如插件）调用时不注册清理，避免 Vue 警告。
    if (getCurrentScope()) {
      onScopeDispose(() => mediaQuery.removeEventListener('change', handleChange))
    }
  }

  return { prefersReducedMotion: readonly(prefersReducedMotion) }
}
