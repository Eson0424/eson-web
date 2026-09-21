import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminContactService } from './admin-contact.service.js'
import { AdminContactQueryDto } from './dto/admin-contact-query.dto.js'
import { UpdateContactMessageDto } from './dto/update-contact-message.dto.js'

/**
 * Admin 联系收件箱（docs/API.md §18）。
 *
 * 与其它 Admin 内容接口一致：整个 controller 由 JWT + ADMIN role 保护（AGENTS §24），
 * 未登录请求在进入 handler 之前就被拒绝，不会返回任何消息内容。
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/messages')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminContactController {
  constructor(private readonly messages: AdminContactService) {}

  @Get()
  @ApiOperation({ summary: 'Admin contact message list（分页 / 状态过滤）' })
  @ApiOkResponse({ description: 'Paginated contact messages (UNREAD first by default)' })
  list(@Query() query: AdminContactQueryDto) {
    return this.messages.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin contact message detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.messages.findById(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update message status（UNREAD / READ / ARCHIVED）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateContactMessageDto) {
    return this.messages.updateStatus(id, dto.status)
  }
}
