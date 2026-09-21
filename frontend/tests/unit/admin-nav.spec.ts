import { describe, expect, it } from 'vitest'
import { ADMIN_NAV_ITEMS, ADMIN_PLACEHOLDER_ROUTES, isAdminNavItemActive } from '../../app/utils/admin-nav'

// Phase 4-A：Admin 导航与路由占位契约。

const APPROVED_ROUTES = [
  '/admin',
  '/admin/work',
  '/admin/lab',
  '/admin/writing',
  '/admin/experience',
  '/admin/categories',
  '/admin/tags',
  '/admin/media',
  '/admin/messages',
  '/admin/settings',
]

describe('admin navigation', () => {
  it('covers every approved admin route exactly once', () => {
    const routes = ADMIN_NAV_ITEMS.map((item) => item.to)

    expect(routes).toEqual(APPROVED_ROUTES)
    expect(new Set(routes).size).toBe(routes.length)
    expect(new Set(ADMIN_NAV_ITEMS.map((item) => item.key)).size).toBe(ADMIN_NAV_ITEMS.length)
  })

  it('marks every not-yet-implemented module as a placeholder route', () => {
    // 已实现：Work / Lab / Writing / Experience / Media / Messages
    const implemented = [
      '/admin',
      '/admin/work',
      '/admin/lab',
      '/admin/writing',
      '/admin/experience',
      '/admin/media',
      '/admin/messages',
    ]

    expect(ADMIN_PLACEHOLDER_ROUTES).toEqual(
      APPROVED_ROUTES.filter((route) => !implemented.includes(route)),
    )

    for (const route of ADMIN_PLACEHOLDER_ROUTES) {
      expect(ADMIN_NAV_ITEMS.some((item) => item.to === route)).toBe(true)
    }
  })

  it('matches the dashboard only on the exact route', () => {
    const dashboard = ADMIN_NAV_ITEMS[0]!

    expect(isAdminNavItemActive('/admin', dashboard)).toBe(true)
    expect(isAdminNavItemActive('/admin/work', dashboard)).toBe(false)
  })

  it('keeps the module entry active on nested routes', () => {
    const work = ADMIN_NAV_ITEMS.find((item) => item.to === '/admin/work')!

    expect(isAdminNavItemActive('/admin/work', work)).toBe(true)
    expect(isAdminNavItemActive('/admin/work/eson-web', work)).toBe(true)
    expect(isAdminNavItemActive('/admin/lab', work)).toBe(false)
  })
})
