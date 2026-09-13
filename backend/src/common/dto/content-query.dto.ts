import { Transform } from 'class-transformer'
import { IsBooleanString, IsIn, IsOptional, IsString, Matches } from 'class-validator'
import { SORT_FIELDS, SORT_ORDERS, SUPPORTED_LOCALES } from '../constants/locale.js'
import { PaginationQueryDto } from './pagination-query.dto.js'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Work / Lab / Writing 列表查询（docs/API.md §10.1、§11、§12.1） */
export class ContentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: string

  @IsOptional()
  @IsBooleanString()
  featured?: string

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'category must be a slug' })
  category?: string

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'tag must be a slug' })
  tag?: string

  @IsOptional()
  @IsIn(SORT_FIELDS as unknown as string[])
  sort?: string

  @IsOptional()
  @IsIn(SORT_ORDERS as unknown as string[])
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  order?: string
}
