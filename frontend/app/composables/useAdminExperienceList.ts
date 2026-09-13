import { useAdminContentList } from './useAdminContentList'

/**
 * Admin Experience 列表：复用共享列表逻辑，但关闭 status / featured 过滤，
 * 并使用与 Public 一致的默认排序（sortOrder ASC）。
 */
export function useAdminExperienceList() {
  const list = useAdminContentList({
    key: 'admin-experience-list',
    resource: useAdminExperienceService(),
    filters: { status: false, featured: false },
    defaultSort: 'sortOrder',
    defaultOrder: 'asc',
  })

  return { ...list, removeExperience: list.removeItem }
}
