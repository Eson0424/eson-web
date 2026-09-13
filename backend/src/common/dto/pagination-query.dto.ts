import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/locale.js'

/** 统一分页参数：page / pageSize（默认 12，最大 100），不使用 limit/offset */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE

  get skip(): number {
    return (this.page - 1) * this.pageSize
  }

  get take(): number {
    return this.pageSize
  }
}
