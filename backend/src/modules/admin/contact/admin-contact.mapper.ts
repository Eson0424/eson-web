import type { ContactMessage } from '@prisma/client'

/**
 * ContactMessage → Admin 视图。
 *
 * 刻意不输出 `ipHash` 与 `userAgent`（AGENTS §28：不保存/不传播不必要的访客数据）。
 * 后台需要的是"能否回复"（name / email / subject / message）与处理进度（status），
 * 因此 Admin API 不暴露任何指纹类字段。
 */
export interface AdminContactMessageView {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessage['status']
  createdAt: string
  updatedAt: string
}

export function mapAdminContactMessage(message: ContactMessage): AdminContactMessageView {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    subject: message.subject,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  }
}
