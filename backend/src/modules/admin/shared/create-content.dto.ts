import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import {
  CONTENT_SLUG_PATTERN,
  CONTENT_STATUSES,
  ContentTranslationDto,
} from './content-translation.dto.js'

/**
 * Admin 内容创建 DTO 的公共字段（Work / Lab / Writing 共用）。
 * 只包含这些模型都有的列；内容特有的列与 translations 由子类补充。
 */
export class CreateBaseContentDto {
  @IsString()
  @Matches(CONTENT_SLUG_PATTERN, {
    message: 'slug must be lowercase, url-safe (a-z, 0-9, dash)',
  })
  @MaxLength(120)
  slug!: string

  @IsIn(CONTENT_STATUSES as unknown as string[])
  status!: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

  @IsOptional()
  @IsBoolean()
  featured?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  categoryIds?: string[]

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  mediaIds?: string[]
}

/** Work / Lab：额外带 github / demo / project 链接 */
export class CreateContentDto extends CreateBaseContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationDto)
  translations!: ContentTranslationDto[]

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  githubUrl?: string | null

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  demoUrl?: string | null

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  projectUrl?: string | null
}
