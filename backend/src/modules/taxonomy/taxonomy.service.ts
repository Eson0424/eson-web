import { Injectable } from '@nestjs/common'
import type { SupportedLocale } from '../../common/constants/locale.js'
import { pickTranslation } from '../../common/utils/translation.js'
import { PrismaService } from '../../prisma/prisma.service.js'

/** Category 与 Tag 的 Public 读取（docs/API.md §14、§15） */
@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(locale: SupportedLocale) {
    const categories = await this.prisma.category.findMany({
      include: { translations: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return categories.map((category) => {
      const picked = pickTranslation(category.translations, locale)

      return {
        id: category.id,
        slug: category.slug,
        name: picked?.translation.name ?? category.slug,
        description: picked?.translation.description ?? undefined,
        locale: picked?.translation.locale,
        localeFallback: picked?.isFallback ?? false,
      }
    })
  }

  async listTags(locale: SupportedLocale) {
    const tags = await this.prisma.tag.findMany({
      include: { translations: true },
      orderBy: { createdAt: 'asc' },
    })

    return tags.map((tag) => {
      const picked = pickTranslation(tag.translations, locale)

      return {
        id: tag.id,
        slug: tag.slug,
        name: picked?.translation.name ?? tag.slug,
        locale: picked?.translation.locale,
        localeFallback: picked?.isFallback ?? false,
      }
    })
  }
}
