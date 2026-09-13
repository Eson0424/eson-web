export interface AuthUser {
  id: string
  email: string
  role: string
  name?: string | null
}

export interface AuthSession {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

/**
 * Admin 认证（AGENTS §24、docs/API.md §4）：
 * - Access Token 只在内存中使用（Authorization: Bearer）
 * - Refresh Token 只通过 HttpOnly Cookie 传输，绝不出现在前端存储
 */
export function useAuthService() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  async function login(email: string, password: string): Promise<AuthSession> {
    const response = await $fetch<{ success: true; data: AuthSession }>('/auth/login', {
      baseURL,
      method: 'POST',
      body: { email, password },
      credentials: 'include',
      timeout: 10_000,
    })

    return response.data
  }

  /** 使用 HttpOnly Cookie 刷新；SSR 时需要把浏览器 Cookie 转发到 API */
  async function refresh(): Promise<AuthSession | null> {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

    try {
      const response = await $fetch<{ success: true; data: AuthSession }>('/auth/refresh', {
        baseURL,
        method: 'POST',
        credentials: 'include',
        headers,
        timeout: 10_000,
      })

      return response.data
    } catch {
      return null
    }
  }

  async function me(accessToken: string): Promise<AuthUser | null> {
    try {
      const response = await $fetch<{ success: true; data: AuthUser }>('/auth/me', {
        baseURL,
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      })

      return response.data
    } catch {
      return null
    }
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/auth/logout', {
        baseURL,
        method: 'POST',
        credentials: 'include',
        timeout: 10_000,
      })
    } catch {
      // 即使后端不可用，也必须清理本地状态
    }
  }

  return { login, refresh, me, logout }
}
