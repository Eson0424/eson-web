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
import type { AdminLabQueryDto } from './dto/admin-lab-query.dto.js'
import type { CreateLabDto } from './dto/create-lab.dto.js'
import type { UpdateLabDto } from './dto/update-lab.dto.js'

const ADMIN_LAB_INCLUDE = {
  translations: true,
  cover: true,
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
  media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.LabInclude

const LAB_WRITE_ERRORS = {
  conflict: 'Lab slug already exists',
  relation: 'Referenced category, tag or media does not exist',
}

/** Admin Lab CMS 服务：写操作全部在事务内完成，Public/Admin 共用同一份数据 */
@Injectable()
export class AdminLabService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminLabQueryDto) {
    const where: Prisma.LabWhereInput = {
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
        : (buildContentOrderBy(query.sort, query.order) as Prisma.LabOrderByWithRelationInput[])

    const [items, total] = await Promise.all([
      this.prisma.lab.findMany({
        where,
        include: ADMIN_LAB_INCLUDE,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.lab.count({ where }),
    ])

    return {
      data: items.map((lab) =>
        mapAdminContentListItem(lab, (query.locale ?? DEFAULT_LOCALE) as SupportedLocale),
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
    const lab = await this.prisma.lab.findUnique({ where: { id }, include: ADMIN_LAB_INCLUDE })

    if (!lab) {
      throw notFound('Lab not found')
    }

    return mapAdminContentDetail(lab, { links: true })
  }

  async create(dto: CreateLabDto) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const lab = await tx.lab.create({
          data: {
            slug: dto.slug,
            status: dto.status,
            featured: dto.featured ?? false,
            sortOrder: dto.sortOrder ?? 0,
            coverMediaId: dto.coverMediaId ?? null,
            githubUrl: dto.githubUrl ?? null,
            demoUrl: dto.demoUrl ?? null,
            projectUrl: dto.projectUrl ?? null,
            publishedAt: resolvePublishedAt(dto.status, dto.publishedAt),
          },
        })

        await tx.labTranslation.createMany({
          data: dto.translations.map((translation) => ({
            labId: lab.id,
            locale: translation.locale,
            title: translation.title,
            subtitle: translation.subtitle ?? null,
            summary: translation.summary ?? null,
            content: translation.content ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
          })),
        })

        await replaceLabRelations(tx, lab.id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.lab.findUniqueOrThrow({ where: { id: lab.id }, include: ADMIN_LAB_INCLUDE })
      })

      return mapAdminContentDetail(created, { links: true })
    } catch (error) {
      throw mapContentWriteError(error, LAB_WRITE_ERRORS)
    }
  }

  async update(id: string, dto: UpdateLabDto) {
    const existing = await this.prisma.lab.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Lab not found')
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.lab.update({
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
            // 发布状态与 publishedAt 由后端保证一致
            ...(dto.status !== undefined
              ? { publishedAt: resolvePublishedAt(dto.status, dto.publishedAt, existing.publishedAt) }
              : dto.publishedAt !== undefined
                ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
                : {}),
          },
        })

        for (const translation of dto.translations ?? []) {
          await tx.labTranslation.upsert({
            where: { labId_locale: { labId: id, locale: translation.locale } },
            update: {
              title: translation.title,
              subtitle: translation.subtitle ?? null,
              summary: translation.summary ?? null,
              content: translation.content ?? null,
              seoTitle: translation.seoTitle ?? null,
              seoDescription: translation.seoDescription ?? null,
            },
            create: {
              labId: id,
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

        await replaceLabRelations(tx, id, dto.categoryIds, dto.tagIds, dto.mediaIds)

        return tx.lab.findUniqueOrThrow({ where: { id }, include: ADMIN_LAB_INCLUDE })
      })

      return mapAdminContentDetail(updated, { links: true })
    } catch (error) {
      throw mapContentWriteError(error, LAB_WRITE_ERRORS)
    }
  }

  /**
   * 删除 Lab：事务内先清理翻译与 join 表，再删除 Lab 本体。
   * Category / Tag / Media 本体不会被删除。
   */
  async remove(id: string) {
    const existing = await this.prisma.lab.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Lab not found')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.labTranslation.deleteMany({ where: { labId: id } })
      await tx.labCategory.deleteMany({ where: { labId: id } })
      await tx.labTag.deleteMany({ where: { labId: id } })
      await tx.labMedia.deleteMany({ where: { labId: id } })
      await tx.lab.delete({ where: { id } })
    })

    return { id, deleted: true }
  }
}

/** Lab 的三类 join 表替换（media 顺序写入 sort_order） */
async function replaceLabRelations(
  tx: Prisma.TransactionClient,
  labId: string,
  categoryIds?: string[],
  tagIds?: string[],
  mediaIds?: string[],
) {
  await replaceRelations([
    {
      ids: categoryIds,
      clear: () => tx.labCategory.deleteMany({ where: { labId } }),
      create: (ids) =>
        tx.labCategory.createMany({ data: ids.map((categoryId) => ({ labId, categoryId })) }),
    },
    {
      ids: tagIds,
      clear: () => tx.labTag.deleteMany({ where: { labId } }),
      create: (ids) => tx.labTag.createMany({ data: ids.map((tagId) => ({ labId, tagId })) }),
    },
    {
      ids: mediaIds,
      clear: () => tx.labMedia.deleteMany({ where: { labId } }),
      create: (ids) =>
        tx.labMedia.createMany({
          data: ids.map((mediaId, index) => ({ labId, mediaId, sortOrder: index })),
        }),
    },
  ])
}
