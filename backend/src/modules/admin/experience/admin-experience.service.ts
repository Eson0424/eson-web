import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import {
  EXPERIENCE_SORT_FIELDS,
  type ExperienceSortField,
} from '../../../common/constants/experience.js'
import { DEFAULT_LOCALE, SORT_ORDERS, type SupportedLocale } from '../../../common/constants/locale.js'
import { notFound, validationError } from '../../../common/errors/app-error.js'
import { toDateString } from '../../../common/utils/content-mapping.js'
import { pickTranslation } from '../../../common/utils/translation.js'
import { PrismaService } from '../../../prisma/prisma.service.js'
import type { AdminExperienceQueryDto } from './dto/admin-experience-query.dto.js'
import type { CreateExperienceDto } from './dto/create-experience.dto.js'
import type { ExperienceTranslationDto } from './dto/experience-translation.dto.js'
import type { UpdateExperienceDto } from './dto/update-experience.dto.js'

const EXPERIENCE_INCLUDE = { translations: true } satisfies Prisma.ExperienceInclude

type ExperienceWithTranslations = Prisma.ExperienceGetPayload<{ include: typeof EXPERIENCE_INCLUDE }>

/** 默认顺序与 Public Experience 一致：sortOrder ASC, startDate DESC, createdAt DESC */
const DEFAULT_ORDER_BY: Prisma.ExperienceOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { startDate: 'desc' },
  { createdAt: 'desc' },
]

/**
 * Admin Experience CMS 服务。
 *
 * 与 Work / Lab / Writing 的关键差异：
 * - experiences 没有 slug / status / featured / published_at，因此没有发布流程、没有 slug 冲突
 * - 没有 categories / tags / media 关系表，写入只涉及 experiences + experience_translations
 * - 展示字段（role / company）的唯一事实来源是 experience_translations；
 *   顶层 experiences.company / experiences.role 在本阶段保持 NULL
 *
 * 写操作都在事务内完成（AGENTS §25、docs/API.md §42）。
 */
@Injectable()
export class AdminExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminExperienceQueryDto) {
    const where: Prisma.ExperienceWhereInput = query.search
      ? {
          OR: [
            {
              translations: {
                some: { roleName: { contains: query.search, mode: 'insensitive' as const } },
              },
            },
            {
              translations: {
                some: { companyName: { contains: query.search, mode: 'insensitive' as const } },
              },
            },
            { location: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [items, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        include: EXPERIENCE_INCLUDE,
        orderBy: buildExperienceOrderBy(query.sort, query.order),
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.experience.count({ where }),
    ])

    return {
      data: items.map((entry) =>
        this.toListItem(entry, (query.locale ?? DEFAULT_LOCALE) as SupportedLocale),
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
    const entry = await this.prisma.experience.findUnique({
      where: { id },
      include: EXPERIENCE_INCLUDE,
    })

    if (!entry) {
      throw notFound('Experience not found')
    }

    return this.toDetail(entry)
  }

  async create(dto: CreateExperienceDto) {
    assertUniqueLocales(dto.translations)
    assertExperienceShape({
      isCurrent: dto.isCurrent ?? false,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
    })

    const created = await this.prisma.$transaction(async (tx) => {
      const experience = await tx.experience.create({
        data: {
          sortOrder: dto.sortOrder ?? 0,
          employmentType: dto.employmentType ?? null,
          location: dto.location ?? null,
          startDate: toDate(dto.startDate),
          endDate: toDate(dto.endDate),
          isCurrent: dto.isCurrent ?? false,
          // 展示字段只写 experience_translations（company / role 保持 NULL）
        },
      })

      await tx.experienceTranslation.createMany({
        data: dto.translations.map((translation) => toTranslationRow(experience.id, translation)),
      })

      return tx.experience.findUniqueOrThrow({
        where: { id: experience.id },
        include: EXPERIENCE_INCLUDE,
      })
    })

    return this.toDetail(created)
  }

  async update(id: string, dto: UpdateExperienceDto) {
    const existing = await this.prisma.experience.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Experience not found')
    }

    if (dto.translations) {
      assertUniqueLocales(dto.translations)
    }

    // isCurrent / endDate 是跨字段约束：需要用「合并后」的值判断
    assertExperienceShape({
      isCurrent: dto.isCurrent ?? existing.isCurrent,
      startDate: dto.startDate !== undefined ? dto.startDate : toDateString(existing.startDate),
      endDate: dto.endDate !== undefined ? dto.endDate : toDateString(existing.endDate),
    })

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.experience.update({
        where: { id },
        data: {
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.employmentType !== undefined ? { employmentType: dto.employmentType } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.startDate !== undefined ? { startDate: toDate(dto.startDate) } : {}),
          ...(dto.endDate !== undefined ? { endDate: toDate(dto.endDate) } : {}),
          ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
        },
      })

      for (const translation of dto.translations ?? []) {
        const row = toTranslationRow(id, translation)

        await tx.experienceTranslation.upsert({
          where: { experienceId_locale: { experienceId: id, locale: translation.locale } },
          update: {
            roleName: row.roleName,
            companyName: row.companyName,
            summary: row.summary,
            content: row.content,
          },
          create: row,
        })
      }

      return tx.experience.findUniqueOrThrow({ where: { id }, include: EXPERIENCE_INCLUDE })
    })

    return this.toDetail(updated)
  }

  /** 删除 Experience：事务内先删翻译，再删本体 */
  async remove(id: string) {
    const existing = await this.prisma.experience.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('Experience not found')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.experienceTranslation.deleteMany({ where: { experienceId: id } })
      await tx.experience.delete({ where: { id } })
    })

    return { id, deleted: true }
  }

  private toListItem(entry: ExperienceWithTranslations, locale: SupportedLocale) {
    const picked = pickTranslation(entry.translations, locale)
    const locales = entry.translations.map((translation) => translation.locale)

    return {
      id: entry.id,
      role: picked?.translation.roleName ?? '',
      company: picked?.translation.companyName ?? null,
      employmentType: entry.employmentType,
      location: entry.location,
      startDate: toDateString(entry.startDate),
      endDate: toDateString(entry.endDate),
      isCurrent: entry.isCurrent,
      sortOrder: entry.sortOrder,
      locale: picked?.translation.locale ?? DEFAULT_LOCALE,
      localeFallback: picked?.isFallback ?? false,
      translationStatus: {
        'zh-CN': locales.includes('zh-CN'),
        'en-US': locales.includes('en-US'),
      },
      missingLocales: ['zh-CN', 'en-US'].filter((item) => !locales.includes(item)),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }
  }

  private toDetail(entry: ExperienceWithTranslations) {
    const locales = entry.translations.map((translation) => translation.locale)

    return {
      id: entry.id,
      sortOrder: entry.sortOrder,
      employmentType: entry.employmentType,
      location: entry.location,
      startDate: toDateString(entry.startDate),
      endDate: toDateString(entry.endDate),
      isCurrent: entry.isCurrent,
      translationStatus: {
        'zh-CN': locales.includes('zh-CN'),
        'en-US': locales.includes('en-US'),
      },
      missingLocales: ['zh-CN', 'en-US'].filter((item) => !locales.includes(item)),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      translations: entry.translations.map((translation) => ({
        locale: translation.locale,
        roleName: translation.roleName,
        companyName: translation.companyName,
        summary: translation.summary,
        content: translation.content,
      })),
    }
  }
}

/** Experience 专属排序：默认 sortOrder ASC → startDate DESC → createdAt DESC */
function buildExperienceOrderBy(
  sort?: string,
  order?: string,
): Prisma.ExperienceOrderByWithRelationInput[] {
  if (sort === undefined && order === undefined) {
    return [...DEFAULT_ORDER_BY]
  }

  const field = (EXPERIENCE_SORT_FIELDS as readonly string[]).includes(sort ?? '')
    ? (sort as ExperienceSortField)
    : 'sortOrder'
  const direction = (SORT_ORDERS as readonly string[]).includes((order ?? '').toLowerCase())
    ? ((order ?? 'asc').toLowerCase() as 'asc' | 'desc')
    : 'asc'

  return field === 'createdAt' ? [{ createdAt: direction }] : [{ [field]: direction }, { createdAt: 'desc' }]
}

function toDate(value?: string | null): Date | null {
  return value ? new Date(value) : null
}

function toTranslationRow(experienceId: string, translation: ExperienceTranslationDto) {
  return {
    experienceId,
    locale: translation.locale,
    roleName: translation.roleName,
    companyName: translation.companyName ?? null,
    summary: translation.summary ?? null,
    content: translation.content ?? null,
  }
}

/** (experience_id, locale) 唯一：重复 locale 属于客户端错误 → 400 而不是 500 */
function assertUniqueLocales(translations: ExperienceTranslationDto[]) {
  const locales = translations.map((translation) => translation.locale)
  const duplicates = [...new Set(locales.filter((locale, index) => locales.indexOf(locale) !== index))]

  if (duplicates.length > 0) {
    throw validationError('Duplicate translation locale', [
      { field: 'translations', code: 'DUPLICATE_LOCALE', locales: duplicates },
    ])
  }
}

/** isCurrent=true 时 endDate 必须为空；startDate 不能晚于 endDate */
function assertExperienceShape(input: {
  isCurrent: boolean
  startDate: string | null | undefined
  endDate: string | null | undefined
}) {
  if (input.isCurrent && input.endDate) {
    throw validationError('isCurrent cannot be combined with endDate', [
      { field: 'endDate', code: 'CURRENT_WITH_END_DATE' },
    ])
  }

  if (input.startDate && input.endDate && new Date(input.startDate) > new Date(input.endDate)) {
    throw validationError('startDate must be on or before endDate', [
      { field: 'endDate', code: 'INVALID_DATE_RANGE' },
    ])
  }
}
