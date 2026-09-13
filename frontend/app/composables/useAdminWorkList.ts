import { useAdminContentList } from './useAdminContentList'

/**
 * Admin Work 列表：共享实现见 useAdminContentList.ts。
 */
export function useAdminWorkList() {
  const list = useAdminContentList({
    key: 'admin-work-list',
    resource: useAdminWorkService(),
  })

  return { ...list, removeWork: list.removeItem }
}
