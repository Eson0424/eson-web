import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SettingsService } from './settings.service.js'

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Public site settings（白名单键）' })
  @ApiOkResponse({ description: 'Whitelisted public settings only' })
  listPublic() {
    return this.settings.listPublic()
  }
}
