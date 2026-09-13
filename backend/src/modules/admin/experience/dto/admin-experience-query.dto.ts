import { Transform } from 'class-transformer'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { EXPERIENCE_SORT_FIELDS } from '../../../../common/constants/experience.js'
import { SORT_ORDERS, SUPPORTED_LOCALES } from '../../../../common/constants/locale.js'
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js'

/**
 * Admin Experience 列表查询。
 * 没有 status / featured 参数（experiences 表没有这两列）。
 */
export class AdminExperienceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsIn(EXPERIENCE_SORT_FIELDS as unknown as string[])
  sort?: string

  @IsOptional()
  @IsIn(SORT_ORDERS as unknown as string[])
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  order?: string

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: string
}
