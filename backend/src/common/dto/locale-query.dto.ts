import { IsIn, IsOptional } from 'class-validator'
import { SUPPORTED_LOCALES } from '../constants/locale.js'

/** 详情接口的 locale 参数（docs/API.md §8） */
export class LocaleQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale?: string
}
