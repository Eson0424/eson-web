import { Controller, Get, Res } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service.js'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Service health check（含数据库连通性）' })
  @ApiOkResponse({ description: 'Service and database are reachable' })
  async check(@Res({ passthrough: true }) response: Response) {
    const database = await this.prisma.checkConnection()

    if (!database.ok) {
      // 明确 unhealthy，不伪造 healthy（Phase 3 §15）
      response.status(503)
    }

    return {
      success: true,
      data: {
        status: database.ok ? 'ok' : 'degraded',
        process: 'up',
        database: database.ok ? 'up' : 'down',
        timestamp: new Date().toISOString(),
      },
      meta: null,
    }
  }
}
