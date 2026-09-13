import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { MAX_PAGE_SIZE } from '../../../common/constants/locale.js'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js'

/**
 * Admin Media 列表查询（Phase 4-F.3）。
 *
 * pageSize 默认 100（= 上限）而不是统一默认 12：
 * 在 Phase 4-F.5 的 MediaPicker 落地前，Work / Lab / Writing 编辑器仍通过
 * `GET /api/v1/admin/media` 拉取可选项（此前该接口一次返回最多 100 条），
 * 默认 12 会让这些编辑器的可选媒体骤减 —— 属于回归，因此这里保持兼容默认值。
 * 4-F.4 的 Media Library 会显式传 page/pageSize。
 */
export class AdminMediaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override pageSize: number = MAX_PAGE_SIZE
}
