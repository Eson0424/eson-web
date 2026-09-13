export interface AdminStats {
  works: { published: number; draft: number; archived: number }
  labs: { published: number; draft: number; archived: number }
  writings: { published: number; draft: number; archived: number }
  experiences: { total: number }
  messages: { unread: number; total: number }
  media: { total: number }
}

/** Admin API 客户端：Access Token 通过 Authorization: Bearer 传入（内存中获取） */
export function useAdminService() {
  const config = useRuntimeConfig()

  async function getStats(accessToken: string): Promise<AdminStats> {
    const response = await $fetch<{ success: true; data: AdminStats }>('/admin/stats', {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10_000,
    })

    return response.data
  }

  return { getStats }
}
