import { Controller, Get, Headers, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { resolveLocale } from '../../common/constants/locale.js'
import { ExperienceQueryDto } from './dto/experience-query.dto.js'
import { ExperienceService } from './experience.service.js'

@ApiTags('experience')
@Controller('experience')
export class ExperienceController {
  constructor(private readonly experience: ExperienceService) {}

  @Get()
  @ApiOperation({ summary: 'Public experience timeline' })
  @ApiOkResponse({ description: 'Paginated list of experience entries' })
  list(
    @Query() query: ExperienceQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.experience.list(
      query.page,
      query.pageSize,
      resolveLocale(query.locale, acceptLanguage),
    )
  }
}
