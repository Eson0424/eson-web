import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'
import { CreateBaseContentDto } from '../../shared/create-content.dto.js'
import { WritingTranslationDto } from './writing-translation.dto.js'

/**
 * Writing 没有 github / demo / project 链接，也没有 start / end date，
 * 因此只继承公共内容字段 + 自己的 translations。
 */
export class CreateWritingDto extends CreateBaseContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WritingTranslationDto)
  translations!: WritingTranslationDto[]
}
