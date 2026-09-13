import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { DEFAULT_LOCALE } from '../../common/constants/locale.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { AdminRoleGuard, JwtAuthGuard } from '../auth/jwt-auth.guard.js'

/**
 * Work 编辑所需的只读引用数据（Phase 4-B）。
 * 只读：不提供 Category / Tag / Media 的写接口（属于后续阶段）。
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Admin category options（全部，含翻译状态）' })
  async categories() {
    const categories = await this.prisma.category.findMany({
      include: { translations: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    })

    return categories.map((category) => this.toOption(category, category.translations, category.slug))
  }

  @Get('tags')
  @ApiOperation({ summary: 'Admin tag options（全部）' })
  async tags() {
    const tags = await this.prisma.tag.findMany({
      include: { translations: true },
      orderBy: { slug: 'asc' },
    })

    return tags.map((tag) => this.toOption(tag, tag.translations, tag.slug))
  }

  private toOption(
    entity: { id: string; slug: string },
    translations: Array<{ locale: string; name: string }>,
    fallbackName: string,
  ) {
    const locales = translations.map((translation) => translation.locale)
    const preferred =
      translations.find((translation) => translation.locale === DEFAULT_LOCALE) ?? translations[0]

    return {
      id: entity.id,
      slug: entity.slug,
      name: preferred?.name ?? fallbackName,
      translationStatus: {
        'zh-CN': locales.includes('zh-CN'),
        'en-US': locales.includes('en-US'),
      },
    }
  }
}
