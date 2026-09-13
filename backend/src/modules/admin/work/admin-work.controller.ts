import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminWorkService } from './admin-work.service.js'
import { AdminWorkQueryDto } from './dto/admin-work-query.dto.js'
import { CreateWorkDto } from './dto/create-work.dto.js'
import { UpdateWorkDto } from './dto/update-work.dto.js'

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/works')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminWorkController {
  constructor(private readonly works: AdminWorkService) {}

  @Get()
  @ApiOperation({ summary: 'Admin work list（分页 / 状态 / 精选 / 搜索 / 排序）' })
  @ApiOkResponse({ description: 'Paginated admin work list' })
  list(@Query() query: AdminWorkQueryDto) {
    return this.works.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin work detail（含全部 translations 与关系 ID）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.works.findById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create work（事务：work + translations + relations）' })
  create(@Body() dto: CreateWorkDto) {
    return this.works.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update work（事务；slug 冲突返回 CONFLICT）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateWorkDto) {
    return this.works.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete work（事务：先清理 translations 与 join 记录）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.works.remove(id)
  }
}
