import { IsOptional, IsString, MaxLength } from 'class-validator'
import { BaseContentTranslationDto } from '../../shared/content-translation.dto.js'

/** Writing 的摘要列是 excerpt（work / lab 用 summary） */
export class WritingTranslationDto extends BaseContentTranslationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string
}
