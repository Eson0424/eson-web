import { IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * multipart 上传的非文件字段（Phase 4-F.3）。
 *
 * 只允许客户端提交 schema 中存在的编辑型 metadata：
 * - alt
 * id / storageKey / url / objectKey / provider / mimeType / size / width / height / createdAt
 * 由服务端生成 —— 传入会被 ValidationPipe（whitelist + forbidNonWhitelisted）以 400 拒绝。
 */
export class UploadMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt?: string
}
