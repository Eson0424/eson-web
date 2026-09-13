import { PartialType } from '@nestjs/swagger'
import { CreateLabDto } from './create-lab.dto.js'

/** PATCH：所有字段可选；slug 冲突由后端返回 CONFLICT */
export class UpdateLabDto extends PartialType(CreateLabDto) {}
