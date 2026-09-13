import { Controller, Get, Headers, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ContentQueryDto } from '../../common/dto/content-query.dto.js'
import { LocaleQueryDto } from '../../common/dto/locale-query.dto.js'
import { resolveLocale } from '../../common/constants/locale.js'
import { WorkService } from './work.service.js'

@ApiTags('work')
@Controller('work')
export class WorkController {
  constructor(private readonly work: WorkService) {}

  @Get()
  @ApiOperation({ summary: 'Public work list（仅 PUBLISHED）' })
  @ApiOkResponse({ description: 'Paginated list of published work' })
  list(@Query() query: ContentQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.work.list(query, resolveLocale(query.locale, acceptLanguage))
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public work detail by slug（仅 PUBLISHED）' })
  @ApiParam({ name: 'slug', example: 'eson-web' })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.work.findBySlug(slug, resolveLocale(query.locale, acceptLanguage))
  }
}
