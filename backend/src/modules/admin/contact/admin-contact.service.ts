import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { notFound } from '../../../common/errors/app-error.js'
import { PrismaService } from '../../../prisma/prisma.service.js'
import { mapAdminContactMessage } from './admin-contact.mapper.js'
import type {
  AdminContactQueryDto,
  ContactMessageStatusValue,
} from './dto/admin-contact-query.dto.js'

/**
 * Admin 联系消息服务（Phase 5-I：上线前 P0 修复）。
 *
 * 只读 + 单字段状态变更；消息正文永远不被改写（访客提交内容不可编辑）。
 * 契约来源：docs/API.md §18。
 */
@Injectable()
export class AdminContactService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminContactQueryDto) {
    const where: Prisma.ContactMessageWhereInput = query.status ? { status: query.status } : {}

    /**
     * 默认排序：UNREAD 优先，其次 createdAt DESC（docs/API.md §18）。
     *
     * PostgreSQL 的 enum 按其声明顺序排序（UNREAD, READ, ARCHIVED），
     * 因此 `status ASC` 恰好等于「未读最前」，同时能命中 @@index([status, createdAt])。
     * 调用方显式传 sort/order 时以调用方为准。
     */
    const orderBy: Prisma.ContactMessageOrderByWithRelationInput[] =
      query.sort === undefined && query.order === undefined
        ? [{ status: 'asc' }, { createdAt: 'desc' }]
        : [{ [query.sort ?? 'createdAt']: query.order ?? 'desc' } as Prisma.ContactMessageOrderByWithRelationInput]

    const [items, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.contactMessage.count({ where }),
    ])

    return {
      data: items.map(mapAdminContactMessage),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  async findById(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } })

    if (!message) {
      throw notFound('Contact message not found')
    }

    return mapAdminContactMessage(message)
  }

  async updateStatus(id: string, status: ContactMessageStatusValue) {
    // 先确认存在，避免把 Prisma 的 P2025 暴露成 500；缺失统一走 404。
    const existing = await this.prisma.contactMessage.findUnique({ where: { id }, select: { id: true } })

    if (!existing) {
      throw notFound('Contact message not found')
    }

    const updated = await this.prisma.contactMessage.update({ where: { id }, data: { status } })

    return mapAdminContactMessage(updated)
  }
}
