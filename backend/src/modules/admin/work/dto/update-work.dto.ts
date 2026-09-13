import { PartialType } from '@nestjs/swagger'
import { CreateWorkDto } from './create-work.dto.js'

/** PATCH：所有字段可选；slug 冲突由后端返回 CONFLICT */
export class UpdateWorkDto extends PartialType(CreateWorkDto) {}
