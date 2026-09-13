import {
  createAdminContentResource,
  type AdminContentDetailBase,
  type AdminContentListItem,
  type AdminContentListResult,
  type AdminContentResource,
} from './admin-content.service'
import type { AdminLabDetailLike } from '~/utils/lab-form'

export type AdminLabListItem = AdminContentListItem
export type AdminLabListResult = AdminContentListResult

export interface AdminLabDetail extends AdminLabDetailLike, AdminContentDetailBase {}

/** Admin Lab API 客户端（JWT + ADMIN），实现见 admin-content.service.ts */
export function useAdminLabService(): AdminContentResource<AdminLabDetail> {
  return createAdminContentResource<AdminLabDetail>('/admin/labs')
}
