/** Admin 导航配置（纯数据，便于测试与复用） */
export interface AdminNavItem {
  key: string
  to: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'dashboard', to: '/admin' },
  { key: 'work', to: '/admin/work' },
  { key: 'lab', to: '/admin/lab' },
  { key: 'writing', to: '/admin/writing' },
  { key: 'experience', to: '/admin/experience' },
  { key: 'categories', to: '/admin/categories' },
  { key: 'tags', to: '/admin/tags' },
  { key: 'media', to: '/admin/media' },
  { key: 'messages', to: '/admin/messages' },
  { key: 'settings', to: '/admin/settings' },
]

/** 尚未实现的 Admin 页面（占位，不提供虚假业务数据） */
export const ADMIN_PLACEHOLDER_ROUTES = [
  '/admin/categories',
  '/admin/tags',
  '/admin/messages',
  '/admin/settings',
]

export function isAdminNavItemActive(currentPath: string, item: AdminNavItem): boolean {
  if (item.to === '/admin') {
    return currentPath === '/admin'
  }

  return currentPath === item.to || currentPath.startsWith(`${item.to}/`)
}
