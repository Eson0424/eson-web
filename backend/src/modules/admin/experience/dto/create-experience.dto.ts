import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { EMPLOYMENT_TYPES } from '../../../../common/constants/experience.js'
import { ExperienceTranslationDto } from './experience-translation.dto.js'

/**
 * Experience 创建 DTO（DATABASE §20–22）。
 *
 * 与 Work / Lab / Writing 的差异：没有 slug / status / featured / publishedAt /
 * cover / 分类 / 标签 / 链接；Experience 只有自己的字段 + translations。
 */
export class CreateExperienceDto {
  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES as unknown as string[])
  employmentType?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null

  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @IsOptional()
  @IsDateString()
  endDate?: string | null

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceTranslationDto)
  translations!: ExperienceTranslationDto[]
}
