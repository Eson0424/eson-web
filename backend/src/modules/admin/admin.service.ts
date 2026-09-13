import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'

/**
 * Admin 统计（Phase 4-A Dashboard 的最小必要接口）。
 *
 * 说明：docs/API.md 尚未定义 statistics endpoint；本阶段按 Phase 4-A 的要求
 * 增加最小实现，放在既有的 /api/v1/admin/* 命名空间下，并由 JWT + ADMIN guard 保护。
 * 所有数字都来自真实数据库查询，不做任何伪造或估算。
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      publishedWorks,
      draftWorks,
      archivedWorks,
      publishedLabs,
      draftLabs,
      archivedLabs,
      publishedWritings,
      draftWritings,
      archivedWritings,
      experiences,
      unreadMessages,
      totalMessages,
      media,
    ] = await Promise.all([
      this.prisma.work.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.work.count({ where: { status: 'DRAFT' } }),
      this.prisma.work.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.lab.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.lab.count({ where: { status: 'DRAFT' } }),
      this.prisma.lab.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.writing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.writing.count({ where: { status: 'DRAFT' } }),
      this.prisma.writing.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.experience.count(),
      this.prisma.contactMessage.count({ where: { status: 'UNREAD' } }),
      this.prisma.contactMessage.count(),
      this.prisma.media.count(),
    ])

    return {
      works: { published: publishedWorks, draft: draftWorks, archived: archivedWorks },
      labs: { published: publishedLabs, draft: draftLabs, archived: archivedLabs },
      writings: { published: publishedWritings, draft: draftWritings, archived: archivedWritings },
      experiences: { total: experiences },
      messages: { unread: unreadMessages, total: totalMessages },
      media: { total: media },
    }
  }
}
