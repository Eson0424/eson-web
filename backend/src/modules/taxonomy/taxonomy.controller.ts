import { Controller, Get, Headers, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { resolveLocale } from '../../common/constants/locale.js'
import { LocaleQueryDto } from '../../common/dto/locale-query.dto.js'
import { TaxonomyService } from './taxonomy.service.js'

@ApiTags('taxonomy')
@Controller()
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Public category list' })
  @ApiOkResponse({ description: 'Category list with localized names' })
  categories(@Query() query: LocaleQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.taxonomy.listCategories(resolveLocale(query.locale, acceptLanguage))
  }

  @Get('tags')
  @ApiOperation({ summary: 'Public tag list' })
  @ApiOkResponse({ description: 'Tag list with localized names' })
  tags(@Query() query: LocaleQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.taxonomy.listTags(resolveLocale(query.locale, acceptLanguage))
  }
}
