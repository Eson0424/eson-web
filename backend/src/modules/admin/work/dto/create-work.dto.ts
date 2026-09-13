import { IsDateString, IsOptional } from 'class-validator'
import { CreateContentDto } from '../../shared/create-content.dto.js'

/** Work 在公共内容字段之上增加起止日期（labs 没有这两列，因此在 Work 侧定义） */
export class CreateWorkDto extends CreateContentDto {
  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @IsOptional()
  @IsDateString()
  endDate?: string | null
}
