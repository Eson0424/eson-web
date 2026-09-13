/**
 * Admin 路由守卫（Phase 4-A）：
 * - 未登录访问 /admin/**
 * - 已登录访问 /admin/login
 * 认证状态来自后端（refresh cookie → /auth/me），前端不做权限判断。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  const isLoginRoute = to.path === '/admin/login'

  if (auth.status === 'idle') {
    await auth.restore()
  }

  if (!auth.isAuthenticated && !isLoginRoute) {
    return navigateTo('/admin/login')
  }

  if (auth.isAuthenticated && isLoginRoute) {
    return navigateTo('/admin')
  }
})
