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

const WRITING_INCLUDE = {
  translations: true,
  cover: true,
  author: { select: { id: true, name: true } },
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
} satisfies Prisma.WritingInclude

type WritingWithRelations = Prisma.WritingGetPayload<{ include: typeof WRITING_INCLUDE }>

@Injectable()
export class WritingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ContentQueryDto, locale: SupportedLocale): Promise<PaginatedPayload<unknown>> {
    const where: Prisma.WritingWhereInput = {
      status: PUBLISHED,
      publishedAt: { not: null },
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.featured === 'false' ? { featured: false } : {}),
      ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.writing.findMany({
        where,
        include: WRITING_INCLUDE,
        // 默认 publishedAt DESC（docs/API.md §12.1）
        orderBy: buildContentOrderBy(query.sort ?? 'publishedAt', query.order ?? 'desc') as Prisma.WritingOrderByWithRelationInput[],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.writing.count({ where }),
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
    const writing = await this.prisma.writing.findFirst({
      where: { slug, status: PUBLISHED, publishedAt: { not: null } },
      include: WRITING_INCLUDE,
    })

    if (!writing) {
      throw notFound('Writing not found')
    }

    return this.toDetail(writing, locale)
  }

  private toSummary(writing: WritingWithRelations, locale: SupportedLocale) {
    const picked = pickTranslation(writing.translations, locale)

    return {
      id: writing.id,
      slug: writing.slug,
      title: picked?.translation.title ?? writing.slug,
      subtitle: picked?.translation.subtitle ?? undefined,
      excerpt: picked?.translation.excerpt ?? '',
      locale: picked?.translation.locale ?? DEFAULT_LOCALE,
      localeFallback: picked?.isFallback ?? false,
      featured: writing.featured,
      readingTime: writing.readingTime ?? null,
      cover: mapMedia(writing.cover),
      author: writing.author ? { id: writing.author.id, name: writing.author.name } : null,
      categories: writing.categories
        .map((link) => pickTranslation(link.category.translations, locale)?.translation.name)
        .filter(Boolean),
      tags: writing.tags
        .map((link) => pickTranslation(link.tag.translations, locale)?.translation.name)
        .filter(Boolean),
      publishedAt: writing.publishedAt?.toISOString() ?? null,
    }
  }

  private toDetail(writing: WritingWithRelations, locale: SupportedLocale) {
    const picked = pickTranslation(writing.translations, locale)

    return {
      ...this.toSummary(writing, locale),
      content: picked?.translation.content ?? null,
      seoTitle: picked?.translation.seoTitle ?? undefined,
      seoDescription: picked?.translation.seoDescription ?? undefined,
    }
  }
}
