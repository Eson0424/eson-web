import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../auth/jwt-auth.guard.js'
import { AdminService } from './admin.service.js'

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
// Admin API 必须由后端 guard 保护（AGENTS §24）：JWT + ADMIN role
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard statistics（真实计数）' })
  @ApiOkResponse({ description: 'Content and message counts per status' })
  stats() {
    return this.admin.getStats()
  }
}
