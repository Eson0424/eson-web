import { useAdminContentList } from './useAdminContentList'

/**
 * Admin Lab 列表：共享实现见 useAdminContentList.ts。
 */
export function useAdminLabList() {
  const list = useAdminContentList({
    key: 'admin-lab-list',
    resource: useAdminLabService(),
  })

  return { ...list, removeLab: list.removeItem }
}
