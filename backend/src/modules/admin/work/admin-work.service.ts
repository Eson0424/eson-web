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
import type { AdminWorkQueryDto } from './dto/admin-work-query.dto.js'
import type { CreateWorkDto } from './dto/create-work.dto.js'
import type { UpdateWorkDto } from './dto/update-work.dto.js'

const ADMIN_WORK_INCLUDE = {
  translations: true,
  cover: true,
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
  media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.WorkInclude

type WorkWithRelations = Prisma.WorkGetPayload<{ include: typeof ADMIN_WORK_INCLUDE }>

const WORK_WRITE_ERRORS = {
  conflict: 'Work slug already exists',
  relation: 'Referenced category, tag or media does not exist',
}

/** Admin Work CMS 服务：所有写操作都在事务内完成，Public/Admin 使用同一份数据 */
@Injectable()
export class AdminWorkService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminWorkQueryDto) {
    const where: Prisma.WorkWhereInput = {
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
        : (buildContentOrderBy(query.sort, query.order) as Prisma.WorkOrderByWithRelationInput[])

    const [items, total] = await Promise.all([
      this.prisma.work.findMany({
        where,
        include: ADMIN_WORK_INCLUDE,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.work.count({ where }),
    ])

    return {
      data: items.map((work) =>
        mapAdminContentListItem(work, (query.locale ?? DEFAULT_LOCALE) as SupportedLocale),
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
    const work = await this.prisma.work.findUnique({ where: { id }, include: ADMIN_WORK_INCLUDE })

    if (!work) {
      throw notFound('Work not found')
    }

    return mapAdminContentDetail(work, { dates: true, links: true })
  }

  async create(dto: CreateWorkDto) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const work = await tx.work.create({
          data: {
            slug: dto.slug,
            status: dto.status,
            featured: dto.featured ?? false,
            sortOrder: dto.sortOrder ?? 0,
            coverMediaId: dto.coverMediaId ?? null,
            githubUrl: dto.githubUrl ?? null,
            demoUrl: dto.demoUrl ?? null,
            projectUrl: dto.projectUrl ?? null,
            startDate: dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            publishedAt: resolvePublishedAt(dto.status, dto.publishedAt),
          },
        })

        await tx.workTranslation.createMany({
          data: dto.translations.map((translation) => ({
            workId: work.id,
            locale: translation.locale,
            title: translation.title,
            subtitle: translation.subtitle ?? null,
            summary: translation.summary ?? null,
            content: translation.content ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
          })),
        })

        await replaceWorkRelations(tx, work.id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.work.findUniqueOrThrow({ where: { id: work.id }, include: ADMIN_WORK_INCLUDE })
      })

      return mapAdminContentDetail(created, { dates: true, links: true })
    } catch (error) {
      throw mapContentWriteError(error, WORK_WRITE_ERRORS)
    }
  }

  async update(id: string, dto: UpdateWorkDto) {
    const existing = await this.prisma.work.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Work not found')
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.work.update({
          where: { id },
          data: {
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
            ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId } : {}),
            ...(dto.githubUrl !== undefined ? { githubUrl: dto.githubUrl } : {}),
            ...(dto.demoUrl !== undefined ? { demoUrl: dto.demoUrl } : {}),
            ...(dto.projectUrl !== undefined ? { projectUrl: dto.projectUrl } : {}),
            ...(dto.startDate !== undefined
              ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
              : {}),
            ...(dto.endDate !== undefined
              ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
              : {}),
            // 发布状态与 publishedAt 由后端保证一致
            ...(dto.status !== undefined
              ? { publishedAt: resolvePublishedAt(dto.status, dto.publishedAt, existing.publishedAt) }
              : dto.publishedAt !== undefined
                ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
                : {}),
          },
        })

        for (const translation of dto.translations ?? []) {
          await tx.workTranslation.upsert({
            where: { workId_locale: { workId: id, locale: translation.locale } },
            update: {
              title: translation.title,
              subtitle: translation.subtitle ?? null,
              summary: translation.summary ?? null,
              content: translation.content ?? null,
              seoTitle: translation.seoTitle ?? null,
              seoDescription: translation.seoDescription ?? null,
            },
            create: {
              workId: id,
              locale: translation.locale,
              title: translation.title,
              subtitle: translation.subtitle ?? null,
              summary: translation.summary ?? null,
              content: translation.content ?? null,
              seoTitle: translation.seoTitle ?? null,
              seoDescription: translation.seoDescription ?? null,
            },
          })
        }

        await replaceWorkRelations(tx, id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.work.findUniqueOrThrow({ where: { id }, include: ADMIN_WORK_INCLUDE })
      })

      return mapAdminContentDetail(updated, { dates: true, links: true })
    } catch (error) {
      throw mapContentWriteError(error, WORK_WRITE_ERRORS)
    }
  }

  /**
   * 删除 Work：
   * - 事务内先清理翻译与 join 表（work_categories / work_tags / work_media），再删除 Work
   * - Category / Tag / Media 本体不会被删除（数据库中为 Restrict + 这里不触碰）
   * - 前端不做任何级联删除
   */
  async remove(id: string) {
    const existing = await this.prisma.work.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Work not found')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workTranslation.deleteMany({ where: { workId: id } })
      await tx.workCategory.deleteMany({ where: { workId: id } })
      await tx.workTag.deleteMany({ where: { workId: id } })
      await tx.workMedia.deleteMany({ where: { workId: id } })
      await tx.work.delete({ where: { id } })
    })

    return { id, deleted: true }
  }
}

/** Work 的三类 join 表替换（media 顺序写入 sort_order） */
async function replaceWorkRelations(
  tx: Prisma.TransactionClient,
  workId: string,
  categoryIds?: string[],
  tagIds?: string[],
  mediaIds?: string[],
) {
  await replaceRelations([
    {
      ids: categoryIds,
      clear: () => tx.workCategory.deleteMany({ where: { workId } }),
      create: (ids) =>
        tx.workCategory.createMany({ data: ids.map((categoryId) => ({ workId, categoryId })) }),
    },
    {
      ids: tagIds,
      clear: () => tx.workTag.deleteMany({ where: { workId } }),
      create: (ids) => tx.workTag.createMany({ data: ids.map((tagId) => ({ workId, tagId })) }),
    },
    {
      ids: mediaIds,
      clear: () => tx.workMedia.deleteMany({ where: { workId } }),
      create: (ids) =>
        tx.workMedia.createMany({
          data: ids.map((mediaId, index) => ({ workId, mediaId, sortOrder: index })),
        }),
    },
  ])
}
