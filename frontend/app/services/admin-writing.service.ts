import {
  createAdminContentResource,
  type AdminContentDetailBase,
  type AdminContentListItem,
  type AdminContentListResult,
  type AdminContentResource,
} from './admin-content.service'
import type { AdminWritingDetailLike } from '~/utils/writing-form'

export type AdminWritingListItem = AdminContentListItem
export type AdminWritingListResult = AdminContentListResult

export interface AdminWritingDetail extends AdminWritingDetailLike, AdminContentDetailBase {}

/** Admin Writing API 客户端（JWT + ADMIN），实现见 admin-content.service.ts */
export function useAdminWritingService(): AdminContentResource<AdminWritingDetail> {
  return createAdminContentResource<AdminWritingDetail>('/admin/writings')
}
