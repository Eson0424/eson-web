/**
 * Admin Dashboard 数据：真实统计接口 /api/v1/admin/stats（JWT + ADMIN）。
 * 401 时先尝试刷新一次（access token 过期），仍失败则抛出，由页面/中间件处理跳转。
 */
export function useAdminStats() {
  const auth = useAuthStore()
  const admin = useAdminService()

  const { data, status, error, refresh } = useAsyncData(
    'admin-stats',
    async () => {
      const token = auth.accessToken

      if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      }

      try {
        return await admin.getStats(token)
      } catch (requestError) {
        const status = (requestError as { statusCode?: number; status?: number })?.statusCode
          ?? (requestError as { status?: number })?.status

        if (status === 401 && (await auth.restore())) {
          return await admin.getStats(auth.accessToken as string)
        }

        throw requestError
      }
    },
  )

  return { stats: data, status, error, refresh }
}
