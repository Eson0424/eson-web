import {
  createAdminContentResource,
  type AdminContentDetailBase,
  type AdminContentListItem,
  type AdminContentListResult,
  type AdminContentResource,
} from './admin-content.service'
import type { AdminWorkDetailLike } from '~/utils/work-form'

export type AdminWorkListItem = AdminContentListItem
export type AdminWorkListResult = AdminContentListResult

export interface AdminWorkDetail extends AdminWorkDetailLike, AdminContentDetailBase {}

/** Admin Work API 客户端（JWT + ADMIN），实现见 admin-content.service.ts */
export function useAdminWorkService(): AdminContentResource<AdminWorkDetail> {
  return createAdminContentResource<AdminWorkDetail>('/admin/works')
}
