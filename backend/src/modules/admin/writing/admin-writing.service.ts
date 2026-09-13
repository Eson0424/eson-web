import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../../common/constants/locale.js'
import { notFound } from '../../../common/errors/app-error.js'
import { buildContentOrderBy } from '../../../common/utils/content-mapping.js'
import { PrismaService } from '../../../prisma/prisma.service.js'
import {
  mapAdminContentDetail,
  mapAdminContentListItem,
} from '../shared/content-admin.mapper.js'
import { mapContentWriteError, replaceRelations, resolvePublishedAt } from '../shared/content-write.js'
import type { AdminWritingQueryDto } from './dto/admin-writing-query.dto.js'
import type { CreateWritingDto } from './dto/create-writing.dto.js'
import type { UpdateWritingDto } from './dto/update-writing.dto.js'

const ADMIN_WRITING_INCLUDE = {
  translations: true,
  cover: true,
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
  media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.WritingInclude

const WRITING_WRITE_ERRORS = {
  conflict: 'Writing slug already exists',
  relation: 'Referenced category, tag or media does not exist',
}

const WRITING_MAPPING = { translationField: 'excerpt' as const }

/**
 * Admin Writing CMS 服务。
 *
 * 正文（WritingTranslation.content）按原样从请求写入数据库、再原样返回：
 * 服务层不做 trim / 转义 / Markdown 解析，保证 Markdown 语义在
 * Admin → Database → Public Writing Detail 链路上不被破坏。
 */
@Injectable()
export class AdminWritingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminWritingQueryDto) {
    const where: Prisma.WritingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.featured === 'false' ? { featured: false } : {}),
      ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' as const } },
              {
                translations: {
                  some: { title: { contains: query.search, mode: 'insensitive' as const } },
                },
              },
            ],
          }
        : {}),
    }

    const orderBy =
      query.sort === undefined && query.order === undefined
        ? [{ updatedAt: 'desc' as const }]
        : (buildContentOrderBy(query.sort, query.order) as Prisma.WritingOrderByWithRelationInput[])

    const [items, total] = await Promise.all([
      this.prisma.writing.findMany({
        where,
        include: ADMIN_WRITING_INCLUDE,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.writing.count({ where }),
    ])

    return {
      data: items.map((writing) =>
        mapAdminContentListItem(writing, (query.locale ?? DEFAULT_LOCALE) as SupportedLocale),
      ),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  async findById(id: string) {
    const writing = await this.prisma.writing.findUnique({
      where: { id },
      include: ADMIN_WRITING_INCLUDE,
    })

    if (!writing) {
      throw notFound('Writing not found')
    }

    return mapAdminContentDetail(writing, WRITING_MAPPING)
  }

  async create(dto: CreateWritingDto) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const writing = await tx.writing.create({
          data: {
            slug: dto.slug,
            status: dto.status,
            featured: dto.featured ?? false,
            sortOrder: dto.sortOrder ?? 0,
            coverMediaId: dto.coverMediaId ?? null,
            publishedAt: resolvePublishedAt(dto.status, dto.publishedAt),
          },
        })

        await tx.writingTranslation.createMany({
          data: dto.translations.map((translation) => ({
            writingId: writing.id,
            locale: translation.locale,
            title: translation.title,
            subtitle: translation.subtitle ?? null,
            excerpt: translation.excerpt ?? null,
            // 原样保存：Markdown 不做 trim / 转义
            content: translation.content ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
          })),
        })

        await replaceWritingRelations(tx, writing.id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.writing.findUniqueOrThrow({
          where: { id: writing.id },
          include: ADMIN_WRITING_INCLUDE,
        })
      })

      return mapAdminContentDetail(created, WRITING_MAPPING)
    } catch (error) {
      throw mapContentWriteError(error, WRITING_WRITE_ERRORS)
    }
  }

  async update(id: string, dto: UpdateWritingDto) {
    const existing = await this.prisma.writing.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Writing not found')
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.writing.update({
          where: { id },
          data: {
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
            ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId } : {}),
            // 发布状态与 publishedAt 由后端保证一致
            ...(dto.status !== undefined
              ? { publishedAt: resolvePublishedAt(dto.status, dto.publishedAt, existing.publishedAt) }
              : dto.publishedAt !== undefined
                ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
                : {}),
          },
        })

        for (const translation of dto.translations ?? []) {
          await tx.writingTranslation.upsert({
            where: { writingId_locale: { writingId: id, locale: translation.locale } },
            update: {
              title: translation.title,
              subtitle: translation.subtitle ?? null,
              excerpt: translation.excerpt ?? null,
              // 原样保存：Markdown 不做 trim / 转义
              content: translation.content ?? null,
              seoTitle: translation.seoTitle ?? null,
              seoDescription: translation.seoDescription ?? null,
            },
            create: {
              writingId: id,
              locale: translation.locale,
              title: translation.title,
              subtitle: translation.subtitle ?? null,
              excerpt: translation.excerpt ?? null,
              content: translation.content ?? null,
              seoTitle: translation.seoTitle ?? null,
              seoDescription: translation.seoDescription ?? null,
            },
          })
        }

        await replaceWritingRelations(tx, id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.writing.findUniqueOrThrow({ where: { id }, include: ADMIN_WRITING_INCLUDE })
      })

      return mapAdminContentDetail(updated, WRITING_MAPPING)
    } catch (error) {
      throw mapContentWriteError(error, WRITING_WRITE_ERRORS)
    }
  }

  /**
   * 删除 Writing：事务内先清理翻译与 join 表，再删除文章本体。
   * Category / Tag / Media 本体不会被删除。
   */
  async remove(id: string) {
    const existing = await this.prisma.writing.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Writing not found')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.writingTranslation.deleteMany({ where: { writingId: id } })
      await tx.writingCategory.deleteMany({ where: { writingId: id } })
      await tx.writingTag.deleteMany({ where: { writingId: id } })
      await tx.writingMedia.deleteMany({ where: { writingId: id } })
      await tx.writing.delete({ where: { id } })
    })

    return { id, deleted: true }
  }
}

/** Writing 的三类 join 表替换（media 顺序写入 sort_order） */
async function replaceWritingRelations(
  tx: Prisma.TransactionClient,
  writingId: string,
  categoryIds?: string[],
  tagIds?: string[],
  mediaIds?: string[],
) {
  await replaceRelations([
    {
      ids: categoryIds,
      clear: () => tx.writingCategory.deleteMany({ where: { writingId } }),
      create: (ids) =>
        tx.writingCategory.createMany({ data: ids.map((categoryId) => ({ writingId, categoryId })) }),
    },
    {
      ids: tagIds,
      clear: () => tx.writingTag.deleteMany({ where: { writingId } }),
      create: (ids) => tx.writingTag.createMany({ data: ids.map((tagId) => ({ writingId, tagId })) }),
    },
    {
      ids: mediaIds,
      clear: () => tx.writingMedia.deleteMany({ where: { writingId } }),
      create: (ids) =>
        tx.writingMedia.createMany({
          data: ids.map((mediaId, index) => ({ writingId, mediaId, sortOrder: index })),
        }),
    },
  ])
}
