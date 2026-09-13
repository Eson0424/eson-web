import { PartialType } from '@nestjs/swagger'
import { CreateExperienceDto } from './create-experience.dto.js'

/** PATCH：所有字段可选（Experience 没有 slug，因此不存在 slug 冲突） */
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}
