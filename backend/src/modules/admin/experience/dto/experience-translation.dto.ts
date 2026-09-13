import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { SUPPORTED_LOCALES } from '../../../../common/constants/locale.js'

/**
 * Experience 翻译 DTO（DATABASE §21）。
 * 字段与 Work / Lab / Writing 不同：这里是 companyName / roleName，
 * 且 roleName 在数据库中是 NOT NULL，必须必填。
 */
export class ExperienceTranslationDto {
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  roleName!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string

  @IsOptional()
  @IsString()
  content?: string
}
