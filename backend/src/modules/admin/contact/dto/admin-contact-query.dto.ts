import { Transform } from 'class-transformer'
import { IsIn, IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js'

/** contact_messages.status 的合法取值（与 prisma enum ContactMessageStatus 一致） */
export const CONTACT_MESSAGE_STATUSES = ['UNREAD', 'READ', 'ARCHIVED'] as const
export type ContactMessageStatusValue = (typeof CONTACT_MESSAGE_STATUSES)[number]

export const CONTACT_MESSAGE_SORT_FIELDS = ['createdAt', 'updatedAt'] as const

/**
 * Admin 消息列表查询（docs/API.md §18）。
 * 只支持文档声明的参数：status / page / pageSize / sort。
 * 不分页之外的过滤（搜索等）不在本阶段范围内，避免与文档契约偏离。
 */
export class AdminContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(CONTACT_MESSAGE_STATUSES as unknown as string[])
  status?: ContactMessageStatusValue

  @IsOptional()
  @IsIn(CONTACT_MESSAGE_SORT_FIELDS as unknown as string[])
  sort?: string

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  order?: 'asc' | 'desc'
}
