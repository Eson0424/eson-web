import { IsIn } from 'class-validator'
import { CONTACT_MESSAGE_STATUSES, type ContactMessageStatusValue } from './admin-contact-query.dto.js'

/**
 * 消息只允许修改状态（AGENTS §28：访客提交内容不可被后台改写）。
 * 未读 → 已读 / 归档；归档 → 已读（取消归档）由同一个 status 字段表达。
 */
export class UpdateContactMessageDto {
  @IsIn(CONTACT_MESSAGE_STATUSES as unknown as string[])
  status!: ContactMessageStatusValue
}
