import { Injectable } from '@nestjs/common'
import type { ContentStatus, Prisma } from '@prisma/client'
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from '../../common/constants/locale.js'
import { buildContentOrderBy, mapMedia, toDateString } from '../../common/utils/content-mapping.js'
import { notFound } from '../../common/errors/app-error.js'
import type { PaginatedPayload } from '../../common/types/api-response.js'
import { pickTranslation } from '../../common/utils/translation.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { ContentQueryDto } from '../../common/dto/content-query.dto.js'

const PUBLISHED: ContentStatus = 'PUBLISHED'

/** 列表：不加载 gallery 关系（避免 list response 膨胀） */
const CONTENT_INCLUDE = {
  translations: true,
  cover: true,
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
} satisfies Prisma.WorkInclude

/**
 * 详情：仅详情加载 gallery（Phase 4-F.6.1）。
 * 顺序由数据库 sort_order 决定（orderBy asc），frontend 不再排序。
 */
const DETAIL_INCLUDE = {
  ...CONTENT_INCLUDE,
  media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.WorkInclude

type WorkWithRelations = Prisma.WorkGetPayload<{ include: typeof CONTENT_INCLUDE }>
type WorkDetailRecord = Prisma.WorkGetPayload<{ include: typeof DETAIL_INCLUDE }>

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ContentQueryDto, locale: SupportedLocale): Promise<PaginatedPayload<unknown>> {
    const where: Prisma.WorkWhereInput = {
      status: PUBLISHED,
      publishedAt: { not: null },
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.featured === 'false' ? { featured: false } : {}),
      ...(query.category
        ? { categories: { some: { category: { slug: query.category } } } }
        : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.work.findMany({
        where,
        include: CONTENT_INCLUDE,
        orderBy: buildContentOrderBy(query.sort, query.order) as Prisma.WorkOrderByWithRelationInput[],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.work.count({ where }),
    ])

    return {
      data: items.map((item) => this.toSummary(item, locale)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  async findBySlug(slug: string, locale: SupportedLocale) {
    const work = await this.prisma.work.findFirst({
      where: { slug, status: PUBLISHED, publishedAt: { not: null } },
      include: DETAIL_INCLUDE,
    })

    if (!work) {
      throw notFound('Work not found')
    }

    return this.toDetail(work, locale)
  }

  private toSummary(work: WorkWithRelations, locale: SupportedLocale) {
    const picked = pickTranslation(work.translations, locale)

    return {
      id: work.id,
      slug: work.slug,
      title: picked?.translation.title ?? work.slug,
      subtitle: picked?.translation.subtitle ?? undefined,
      summary: picked?.translation.summary ?? '',
      locale: picked?.translation.locale ?? DEFAULT_LOCALE,
      localeFallback: picked?.isFallback ?? false,
      featured: work.featured,
      year: work.startDate ? String(work.startDate.getUTCFullYear()) : undefined,
      cover: mapMedia(work.cover),
      categories: work.categories.map((link) =>
        pickTranslation(link.category.translations, locale)?.translation.name,
      ).filter(Boolean),
      tags: work.tags.map((link) => pickTranslation(link.tag.translations, locale)?.translation.name).filter(Boolean),
      startDate: toDateString(work.startDate),
      endDate: toDateString(work.endDate),
      publishedAt: work.publishedAt?.toISOString() ?? null,
      githubUrl: work.githubUrl ?? undefined,
      demoUrl: work.demoUrl ?? undefined,
      projectUrl: work.projectUrl ?? undefined,
    }
  }

  private toDetail(work: WorkDetailRecord, locale: SupportedLocale) {
    const picked = pickTranslation(work.translations, locale)

    return {
      ...this.toSummary(work, locale),
      // Gallery：顺序即 sort_order（backend authoritative），caption 目前恒为 null
      gallery: work.media.map((link) => ({
        id: link.mediaId,
        caption: link.caption,
        sortOrder: link.sortOrder,
        media: mapMedia(link.media),
      })),
      content: picked?.translation.content ?? null,
      seoTitle: picked?.translation.seoTitle ?? undefined,
      seoDescription: picked?.translation.seoDescription ?? undefined,
    }
  }
}
