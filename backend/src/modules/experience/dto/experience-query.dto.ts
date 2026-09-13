import { IsIn, IsOptional } from 'class-validator'
import { SUPPORTED_LOCALES } from '../../../common/constants/locale.js'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js'

/**
 * Experience 列表查询。
 * 必须是真实 DTO 类（不能用 TS 交叉类型），否则 ValidationPipe 无法转换，
 * page/pageSize 会保持字符串或 undefined，导致 Prisma 收到 NaN。
 */
export class ExperienceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: string
}
