import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoleGuard, JwtAuthGuard } from '../../auth/jwt-auth.guard.js'
import { AdminExperienceService } from './admin-experience.service.js'
import { AdminExperienceQueryDto } from './dto/admin-experience-query.dto.js'
import { CreateExperienceDto } from './dto/create-experience.dto.js'
import { UpdateExperienceDto } from './dto/update-experience.dto.js'

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/experiences')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminExperienceController {
  constructor(private readonly experiences: AdminExperienceService) {}

  @Get()
  @ApiOperation({ summary: 'Admin experience list（分页 / 搜索 / 排序）' })
  @ApiOkResponse({ description: 'Paginated admin experience list' })
  list(@Query() query: AdminExperienceQueryDto) {
    return this.experiences.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin experience detail（含全部 translations）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.experiences.findById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create experience（事务：experience + translations）' })
  create(@Body() dto: CreateExperienceDto) {
    return this.experiences.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update experience（事务：experience + translations upsert）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateExperienceDto) {
    return this.experiences.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete experience（事务：先清理 translations）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.experiences.remove(id)
  }
}
