import { Controller, Get, Headers, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { resolveLocale } from '../../common/constants/locale.js'
import { ContentQueryDto } from '../../common/dto/content-query.dto.js'
import { LocaleQueryDto } from '../../common/dto/locale-query.dto.js'
import { WritingService } from './writing.service.js'

@ApiTags('writing')
@Controller('writing')
export class WritingController {
  constructor(private readonly writing: WritingService) {}

  @Get()
  @ApiOperation({ summary: 'Public writing list（仅 PUBLISHED，默认 publishedAt DESC）' })
  @ApiOkResponse({ description: 'Paginated list of published articles' })
  list(@Query() query: ContentQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.writing.list(query, resolveLocale(query.locale, acceptLanguage))
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public writing detail by slug（仅 PUBLISHED）' })
  @ApiParam({ name: 'slug', example: 'engineering-first-design-system' })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.writing.findBySlug(slug, resolveLocale(query.locale, acceptLanguage))
  }
}
