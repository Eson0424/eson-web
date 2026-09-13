import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminLabService } from './admin-lab.service.js'
import { AdminLabQueryDto } from './dto/admin-lab-query.dto.js'
import { CreateLabDto } from './dto/create-lab.dto.js'
import { UpdateLabDto } from './dto/update-lab.dto.js'

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/labs')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminLabController {
  constructor(private readonly labs: AdminLabService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lab list（分页 / 状态 / 精选 / 搜索 / 排序）' })
  @ApiOkResponse({ description: 'Paginated admin lab list' })
  list(@Query() query: AdminLabQueryDto) {
    return this.labs.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin lab detail（含全部 translations 与关系 ID）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.labs.findById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create lab（事务：lab + translations + relations）' })
  create(@Body() dto: CreateLabDto) {
    return this.labs.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lab（事务；slug 冲突返回 CONFLICT）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateLabDto) {
    return this.labs.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lab（事务：先清理 translations 与 join 记录）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.labs.remove(id)
  }
}
