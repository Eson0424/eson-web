import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../common/constants/locale.js'
import type { PaginatedPayload } from '../../common/types/api-response.js'
import { toDateString } from '../../common/utils/content-mapping.js'
import { pickTranslation } from '../../common/utils/translation.js'
import { PrismaService } from '../../prisma/prisma.service.js'

const EXPERIENCE_INCLUDE = { translations: true } satisfies Prisma.ExperienceInclude

type ExperienceWithRelations = Prisma.ExperienceGetPayload<{ include: typeof EXPERIENCE_INCLUDE }>

@Injectable()
export class ExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  /** 排序：sortOrder ASC, startDate DESC（docs/API.md §13） */
  async list(page: number, pageSize: number, locale: SupportedLocale): Promise<PaginatedPayload<unknown>> {
    const [items, total] = await Promise.all([
      this.prisma.experience.findMany({
        include: EXPERIENCE_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.experience.count(),
    ])

    return {
      data: items.map((item) => this.toItem(item, locale)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    }
  }

  private toItem(entry: ExperienceWithRelations, locale: SupportedLocale) {
    const picked = pickTranslation(entry.translations, locale)

    return {
      id: entry.id,
      // Experience 没有 slug 列（DATABASE §20）；保留 id 供前端做 key / 未来详情路由
      role: picked?.translation.roleName ?? '',
      company: picked?.translation.companyName ?? undefined,
      employmentType: entry.employmentType ?? undefined,
      location: entry.location ?? undefined,
      startDate: toDateString(entry.startDate),
      endDate: toDateString(entry.endDate),
      isCurrent: entry.isCurrent,
      summary: picked?.translation.summary ?? '',
      content: picked?.translation.content ?? null,
      locale: picked?.translation.locale ?? DEFAULT_LOCALE,
      localeFallback: picked?.isFallback ?? false,
    }
  }
}
