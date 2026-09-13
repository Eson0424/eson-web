import { IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * PATCH /admin/media/:id —— 只允许修改 alt（当前 Media schema 中唯一的编辑型 metadata）。
 *
 * Media 没有 caption 列（caption 属于 work_media / lab_media / writing_media 关系表），
 * 因此本阶段不接受 caption，也不为此新增 schema 字段。
 * storageKey / url / mimeType / size / width / height 等不可变字段传入会被 400 拒绝。
 */
export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt?: string | null
}
