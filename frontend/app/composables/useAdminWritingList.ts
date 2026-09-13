import { useAdminContentList } from './useAdminContentList'

/**
 * Admin Writing 列表：共享实现见 useAdminContentList.ts。
 */
export function useAdminWritingList() {
  const list = useAdminContentList({
    key: 'admin-writing-list',
    resource: useAdminWritingService(),
  })

  return { ...list, removeWriting: list.removeItem }
}
