import { Controller, Get, Headers, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { resolveLocale } from '../../common/constants/locale.js'
import { ContentQueryDto } from '../../common/dto/content-query.dto.js'
import { LocaleQueryDto } from '../../common/dto/locale-query.dto.js'
import { LabService } from './lab.service.js'

@ApiTags('lab')
@Controller('lab')
export class LabController {
  constructor(private readonly lab: LabService) {}

  @Get()
  @ApiOperation({ summary: 'Public lab list（仅 PUBLISHED）' })
  @ApiOkResponse({ description: 'Paginated list of published experiments' })
  list(@Query() query: ContentQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.lab.list(query, resolveLocale(query.locale, acceptLanguage))
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public lab detail by slug（仅 PUBLISHED）' })
  @ApiParam({ name: 'slug', example: 'agent-workflow-prototype' })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.lab.findBySlug(slug, resolveLocale(query.locale, acceptLanguage))
  }
}
