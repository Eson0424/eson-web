import { createAdminContentResource, type AdminContentListResult } from './admin-content.service'

/** contact_messages.status（prisma enum ContactMessageStatus） */
export type ContactMessageStatus = 'UNREAD' | 'READ' | 'ARCHIVED'

/**
 * Admin 消息视图。
 *
 * 与后端 mapAdminContactMessage 对齐：刻意不含 ipHash / userAgent
 * —— 后台只需要"能否回复"与处理进度。
 */
export interface AdminContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessageStatus
  createdAt: string
  updatedAt: string
}

export interface AdminMessageService {
  list(
    accessToken: string,
    query: Record<string, unknown>,
  ): Promise<AdminContentListResult<AdminContactMessage>>
  updateStatus(
    accessToken: string,
    id: string,
    status: ContactMessageStatus,
  ): Promise<AdminContactMessage>
}

/**
 * Admin Messages API 客户端（docs/API.md §18）。
 *
 * 列表接口已经返回完整消息正文，因此后台选中消息时不需要再请求 detail，
 * 少一次往返也避免选中瞬间的空白态。detail 端点由后端按契约提供并被单测覆盖。
 */
export function useAdminMessageService(): AdminMessageService {
  const resource = createAdminContentResource<AdminContactMessage, AdminContactMessage>(
    '/admin/messages',
  )

  return {
    list: (accessToken, query) => resource.list(accessToken, query),
    updateStatus: (accessToken, id, status) => resource.update(accessToken, id, { status }),
  }
}
