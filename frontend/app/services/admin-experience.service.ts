import {
  createAdminContentResource,
  type AdminContentResource,
} from './admin-content.service'
import type { AdminExperienceDetailLike } from '~/utils/experience-form'

/**
 * Admin Experience 列表项：与内容型列表项（slug/status/featured）完全不同，
 * 因此使用 Experience 自己的类型。
 */
export interface AdminExperienceListItem {
  id: string
  role: string
  company: string | null
  employmentType: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  sortOrder: number
  locale: string
  localeFallback: boolean
  translationStatus: Record<string, boolean>
  missingLocales: string[]
  createdAt: string
  updatedAt: string
}

export interface AdminExperienceDetail extends AdminExperienceDetailLike {
  translationStatus: Record<string, boolean>
  missingLocales: string[]
  createdAt: string
  updatedAt: string
}

/** Admin Experience API 客户端（JWT + ADMIN），HTTP/envelope 复用共享资源工厂 */
export function useAdminExperienceService(): AdminContentResource<
  AdminExperienceDetail,
  AdminExperienceListItem
> {
  return createAdminContentResource<AdminExperienceDetail, AdminExperienceListItem>(
    '/admin/experiences',
  )
}
