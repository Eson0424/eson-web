import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { SUPPORTED_LOCALES } from '../../../common/constants/locale.js'

/** slug 规则（AGENTS §37、docs/API.md §30） */
export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 内容状态（docs/API.md §22） */
export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

/**
 * Admin 内容翻译 DTO 的公共字段（DATABASE §9）。
 *
 * Work / Lab 的摘要列是 `summary`，Writing 的摘要列是 `excerpt`（DATABASE §8/§12），
 * 因此摘要字段由各自的子类声明，避免某个模块把不存在的列当成有效字段静默忽略。
 */
export class BaseContentTranslationDto {
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string

  @IsOptional()
  @IsString()
  @MaxLength(400)
  seoDescription?: string
}

/** Work / Lab：writings 之外的翻译摘要列为 summary */
export class ContentTranslationDto extends BaseContentTranslationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string
}
