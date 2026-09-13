import type { Request, Response } from 'express'

/** 极简 Cookie 读写：避免为读取 refresh token 引入 cookie-parser 依赖 */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie

  if (!header) {
    return null
  }

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')

    if (key === name) {
      return decodeURIComponent(rest.join('='))
    }
  }

  return null
}

export interface RefreshCookieOptions {
  secure: boolean
  maxAgeMs: number
}

/** Refresh Token 只通过 HttpOnly Cookie 传输（AGENTS §24、API §4） */
export function setRefreshCookie(response: Response, token: string, options: RefreshCookieOptions) {
  response.cookie('refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: options.secure,
    // Path=/ ：使 cookie 也能被前端 SSR（Nuxt server）接收并转发给 API，
    // 否则跨端口部署时 SSR 无法恢复会话（HttpOnly + SameSite=Lax 仍然保持）。
    path: '/',
    maxAge: options.maxAgeMs,
  })
}

export function clearRefreshCookie(response: Response) {
  response.clearCookie('refresh_token', { path: '/' })
}
