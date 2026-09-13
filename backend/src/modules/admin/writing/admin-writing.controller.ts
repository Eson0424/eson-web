import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminWritingService } from './admin-writing.service.js'
import { AdminWritingQueryDto } from './dto/admin-writing-query.dto.js'
import { CreateWritingDto } from './dto/create-writing.dto.js'
import { UpdateWritingDto } from './dto/update-writing.dto.js'

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/writings')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminWritingController {
  constructor(private readonly writings: AdminWritingService) {}

  @Get()
  @ApiOperation({ summary: 'Admin writing list（分页 / 状态 / 精选 / 搜索 / 排序）' })
  @ApiOkResponse({ description: 'Paginated admin writing list' })
  list(@Query() query: AdminWritingQueryDto) {
    return this.writings.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin writing detail（含全部 translations 与关系 ID）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.writings.findById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create writing（事务：writing + translations + relations）' })
  create(@Body() dto: CreateWritingDto) {
    return this.writings.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update writing（事务；slug 冲突返回 CONFLICT）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateWritingDto) {
    return this.writings.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete writing（事务：先清理 translations 与 join 记录）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.writings.remove(id)
  }
}
