import { PartialType } from '@nestjs/swagger'
import { CreateWritingDto } from './create-writing.dto.js'

/** PATCH：所有字段可选；slug 冲突由后端返回 CONFLICT */
export class UpdateWritingDto extends PartialType(CreateWritingDto) {}
