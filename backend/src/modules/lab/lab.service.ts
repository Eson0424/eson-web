import { Injectable } from '@nestjs/common'
import type { ContentStatus, Prisma } from '@prisma/client'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../common/constants/locale.js'
import type { ContentQueryDto } from '../../common/dto/content-query.dto.js'
import { notFound } from '../../common/errors/app-error.js'
import type { PaginatedPayload } from '../../common/types/api-response.js'
import { buildContentOrderBy, mapMedia } from '../../common/utils/content-mapping.js'
import { pickTranslation } from '../../common/utils/translation.js'
import { PrismaService } from '../../prisma/prisma.service.js'

const PUBLISHED: ContentStatus = 'PUBLISHED'

/** 列表：不加载 gallery 关系（避免 list response 膨胀） */
const LAB_INCLUDE = {
  translations: true,
  cover: true,
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
} satisfies Prisma.LabInclude

/**
 * 详情：仅详情加载 gallery（Phase 4-F.6.1）。
 * 顺序由数据库 sort_order 决定（orderBy asc），frontend 不再排序。
 */
const LAB_DETAIL_INCLUDE = {
  ...LAB_INCLUDE,
  media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.LabInclude

type LabWithRelations = Prisma.LabGetPayload<{ include: typeof LAB_INCLUDE }>
type LabDetailRecord = Prisma.LabGetPayload<{ include: typeof LAB_DETAIL_INCLUDE }>

@Injectable()
export class LabService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ContentQueryDto, locale: SupportedLocale): Promise<PaginatedPayload<unknown>> {
    const where: Prisma.LabWhereInput = {
      status: PUBLISHED,
      publishedAt: { not: null },
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.featured === 'false' ? { featured: false } : {}),
      ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.lab.findMany({
        where,
        include: LAB_INCLUDE,
        orderBy: buildContentOrderBy(query.sort, query.order) as Prisma.LabOrderByWithRelationInput[],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.lab.count({ where }),
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
    const lab = await this.prisma.lab.findFirst({
      where: { slug, status: PUBLISHED, publishedAt: { not: null } },
      include: LAB_DETAIL_INCLUDE,
    })

    if (!lab) {
      throw notFound('Lab experiment not found')
    }

    return this.toDetail(lab, locale)
  }

  private toSummary(lab: LabWithRelations, locale: SupportedLocale) {
    const picked = pickTranslation(lab.translations, locale)

    return {
      id: lab.id,
      slug: lab.slug,
      title: picked?.translation.title ?? lab.slug,
      subtitle: picked?.translation.subtitle ?? undefined,
      summary: picked?.translation.summary ?? '',
      locale: picked?.translation.locale ?? DEFAULT_LOCALE,
      localeFallback: picked?.isFallback ?? false,
      featured: lab.featured,
      cover: mapMedia(lab.cover),
      categories: lab.categories
        .map((link) => pickTranslation(link.category.translations, locale)?.translation.name)
        .filter(Boolean),
      tags: lab.tags
        .map((link) => pickTranslation(link.tag.translations, locale)?.translation.name)
        .filter(Boolean),
      publishedAt: lab.publishedAt?.toISOString() ?? null,
      githubUrl: lab.githubUrl ?? undefined,
      demoUrl: lab.demoUrl ?? undefined,
      projectUrl: lab.projectUrl ?? undefined,
    }
  }

  private toDetail(lab: LabDetailRecord, locale: SupportedLocale) {
    const picked = pickTranslation(lab.translations, locale)

    return {
      ...this.toSummary(lab, locale),
      // Gallery：顺序即 sort_order（backend authoritative），caption 目前恒为 null
      gallery: lab.media.map((link) => ({
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
