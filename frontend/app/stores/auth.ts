import { defineStore } from 'pinia'
import type { AuthUser } from '~/services/auth.service'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

/**
 * Admin 认证状态。
 * Access Token 只保存在内存（Pinia state），页面刷新后通过 HttpOnly refresh cookie 恢复；
 * 任何 token 都不写入 localStorage / sessionStorage / cookie（前端侧）。
 */
export const useAuthStore = defineStore('auth', () => {
  const auth = useAuthService()

  const user = ref<AuthUser | null>(null)
  const accessToken = ref<string | null>(null)
  const status = ref<AuthStatus>('idle')
  const errorCode = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(user.value && accessToken.value))

  function reset() {
    user.value = null
    accessToken.value = null
    errorCode.value = null
    status.value = 'anonymous'
  }

  async function login(email: string, password: string) {
    status.value = 'loading'
    errorCode.value = null

    try {
      const session = await auth.login(email, password)

      accessToken.value = session.accessToken
      user.value = session.user
      status.value = 'authenticated'

      return true
    } catch (error) {
      const code = (error as { data?: { error?: { code?: string } } })?.data?.error?.code

      reset()
      errorCode.value = code ?? 'INTERNAL_ERROR'

      return false
    }
  }

  /** 恢复会话：SSR/CSR 都通过 HttpOnly cookie 换新的 access token */
  async function restore() {
    if (status.value === 'loading') {
      return isAuthenticated.value
    }

    status.value = 'loading'

    const session = await auth.refresh()

    if (!session) {
      reset()
      return false
    }

    accessToken.value = session.accessToken
    user.value = session.user
    status.value = 'authenticated'

    return true
  }

  /** 401 时重新确认身份（例如 access token 过期） */
  async function ensureFresh() {
    if (!accessToken.value) {
      return restore()
    }

    const current = await auth.me(accessToken.value)

    if (current) {
      user.value = current
      status.value = 'authenticated'
      return true
    }

    return restore()
  }

  async function logout() {
    await auth.logout()
    reset()
  }

  return {
    user,
    accessToken,
    status,
    errorCode,
    isAuthenticated,
    login,
    restore,
    ensureFresh,
    logout,
    reset,
  }
})
