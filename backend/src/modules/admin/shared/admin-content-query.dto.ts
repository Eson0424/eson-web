import { Transform } from 'class-transformer'
import { IsBooleanString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import {
  SORT_FIELDS,
  SORT_ORDERS,
  SUPPORTED_LOCALES,
} from '../../../common/constants/locale.js'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js'
import { CONTENT_SLUG_PATTERN } from './content-translation.dto.js'

/** Admin 内容列表查询（分页 + 状态/精选/搜索/排序/分类/标签），Work 与 Lab 共用 */
export class AdminContentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

  @IsOptional()
  @IsBooleanString()
  featured?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsIn(SORT_FIELDS as unknown as string[])
  sort?: string

  @IsOptional()
  @IsIn(SORT_ORDERS as unknown as string[])
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  order?: string

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: string

  @IsOptional()
  @IsString()
  @Matches(CONTENT_SLUG_PATTERN, { message: 'category must be a slug' })
  category?: string

  @IsOptional()
  @IsString()
  @Matches(CONTENT_SLUG_PATTERN, { message: 'tag must be a slug' })
  tag?: string
}
