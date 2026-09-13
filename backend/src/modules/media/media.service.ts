import { Injectable, Logger } from '@nestjs/common'
import type { Media, Prisma } from '@prisma/client'
import { ERROR_CODES, AppError, notFound } from '../../common/errors/app-error.js'
import type { PaginatedPayload } from '../../common/types/api-response.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { AdminMediaQueryDto } from './dto/admin-media-query.dto.js'
import type { UpdateMediaDto } from './dto/update-media.dto.js'
import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES as MAX_UPLOAD_BYTES_LIMIT } from './image-inspection.js'
import {
  mediaDatabaseFailure,
  mediaInUse,
  mediaNotFound,
  storageDeleteFailed,
  type MediaReferenceSummary,
} from './media-errors.js'
import { toAdminMediaView, type AdminMediaView } from './media.mapper.js'
import { StorageService } from './storage.service.js'
import type { StoredObject } from './storage.types.js'
import {
  uploadFailure,
  validateAltText,
  validateUploadCandidate,
  type UploadCandidateInput,
  type ValidatedUpload,
} from './upload-validation.js'

/** 允许的图片类型与大小上限（docs/API.md §16.1） */
export const ALLOWED_IMAGE_MIME_TYPES = IMAGE_MIME_TYPES
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES_LIMIT

export interface MediaMetadataInput {
  storageKey: string
  url: string
  filename: string
  originalFilename?: string
  mimeType: string
  size?: number
  width?: number
  height?: number
  alt?: string
  metadata?: Prisma.InputJsonValue
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private readonly logger = new Logger(MediaService.name)

  /** 上传前的校验 foundation：MIME、大小（客户端声明的 MIME 不能作为唯一依据） */
  validateUpload(input: { mimeType: string; size: number }): void {
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new AppError(
        ERROR_CODES.FILE_UPLOAD_ERROR,
        `Unsupported mime type: ${input.mimeType}`,
        422,
      )
    }

    if (input.size > MAX_UPLOAD_BYTES) {
      throw new AppError(ERROR_CODES.FILE_UPLOAD_ERROR, 'File exceeds the 10MB limit', 422)
    }
  }

  isStorageConfigured(): boolean {
    return this.storage.isConfigured()
  }

  createMetadata(input: MediaMetadataInput) {
    return this.prisma.media.create({ data: { ...input } })
  }

  findById(id: string) {
    return this.prisma.media.findUnique({ where: { id } })
  }

  async findByIdOrFail(id: string) {
    const media = await this.findById(id)

    if (!media) {
      throw notFound('Media not found')
    }

    return media
  }

  list(page: number, pageSize: number) {
    return this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
  }

  /** Admin Media Library 数据源：分页 + createdAt DESC，返回不含 storageKey / 凭证的视图 */
  async listForAdmin(query: AdminMediaQueryDto): Promise<PaginatedPayload<AdminMediaView>> {
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.media.count(),
    ])

    return {
      data: items.map(toAdminMediaView),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  /**
   * PATCH：只允许修改 alt（当前 Media schema 中唯一的编辑型 metadata）。
   * 不触碰 StorageDriver，不重新上传文件，不重新生成 object key。
   */
  async updateMetadata(id: string, dto: UpdateMediaDto): Promise<Media> {
    const media = await this.findById(id)

    if (!media) {
      throw mediaNotFound(id)
    }

    try {
      return await this.prisma.media.update({
        where: { id },
        data: {
          // undefined = 不修改；null / '' = 清空 alt
          ...(dto.alt !== undefined ? { alt: validateAltText(dto.alt) } : {}),
        },
      })
    } catch (databaseError) {
      this.logger.error(
        JSON.stringify({
          event: 'media.update.db_failure',
          mediaId: id,
          databaseError: describeError(databaseError),
        }),
      )

      throw mediaDatabaseFailure('update')
    }
  }

  /** 当前 schema 中所有 Media 外键引用（cover + gallery） */
  async countReferences(mediaId: string): Promise<MediaReferenceSummary> {
    const [worksCover, labsCover, writingsCover, workMedia, labMedia, writingMedia] = await Promise.all([
      this.prisma.work.count({ where: { coverMediaId: mediaId } }),
      this.prisma.lab.count({ where: { coverMediaId: mediaId } }),
      this.prisma.writing.count({ where: { coverMediaId: mediaId } }),
      this.prisma.workMedia.count({ where: { mediaId } }),
      this.prisma.labMedia.count({ where: { mediaId } }),
      this.prisma.writingMedia.count({ where: { mediaId } }),
    ])

    return {
      worksCover,
      labsCover,
      writingsCover,
      workMedia,
      labMedia,
      writingMedia,
      total: worksCover + labsCover + writingsCover + workMedia + labMedia + writingMedia,
    }
  }

  /**
   * DELETE（Phase 4-F.3 §8）：
   * 1. 不存在 → 404 MEDIA_NOT_FOUND
   * 2. 仍被 Work / Lab / Writing 引用 → 409 MEDIA_IN_USE（不解除关系、不删除）
   * 3. 先删存储对象，成功后再删 DB 行（顺序不可颠倒）
   * 4. 存储删除失败 → 503，DB 行保持不变
   * 5. DB 删除失败 → 结构化日志（media id / objectKey / DB error），不再二次删除对象
   */
  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const media = await this.findById(id)

    if (!media) {
      throw mediaNotFound(id)
    }

    const references = await this.countReferences(id)

    if (references.total > 0) {
      throw mediaInUse(references)
    }

    try {
      await this.storage.delete(media.storageKey)
    } catch {
      // 不泄露本地路径 / stack / 凭证；DB 行保持不变
      throw storageDeleteFailed()
    }

    try {
      await this.prisma.media.delete({ where: { id } })
    } catch (databaseError) {
      this.logger.error(
        JSON.stringify({
          event: 'media.delete.db_failure',
          mediaId: id,
          objectKey: media.storageKey,
          databaseError: describeError(databaseError),
        }),
      )

      throw mediaDatabaseFailure('delete')
    }

    return { id, deleted: true }
  }

  /**
   * 真实上传流程（Phase 4-F.2）。
   *
   * 顺序不可颠倒：先 storage.put()，成功后再 prisma.media.create()。
   * PostgreSQL 事务无法覆盖对象存储，因此 DB 写入失败时必须补偿删除刚写入的对象。
   * 上传接口（multipart）属于 Phase 4-F.3，本方法只负责「已验证文件 → 存储 + 元数据」。
   */
  async upload(input: UploadCandidateInput): Promise<Media> {
    const validated: ValidatedUpload = validateUploadCandidate(input)

    if (!this.storage.isConfigured()) {
      throw uploadFailure('STORAGE_UNAVAILABLE', 'Media storage is unavailable', 503)
    }

    const objectKey = this.storage.buildObjectKey(validated.mimeType)
    const url = this.storage.buildPublicUrl(objectKey)
    const stored = await this.storeObject(objectKey, validated)

    try {
      return await this.prisma.media.create({
        data: {
          storageKey: stored.key,
          url,
          // 展示用名称：客户端文件名（已规范化）或 object key 的文件名部分
          filename: validated.filename ?? objectKey.split('/').pop() ?? stored.key,
          originalFilename: validated.originalFilename,
          mimeType: validated.mimeType,
          size: stored.size,
          width: validated.width,
          height: validated.height,
          alt: validated.alt,
          metadata: { provider: this.storage.getDriverName() },
        },
      })
    } catch (databaseError) {
      await this.compensateFailedUpload(stored.key, databaseError)

      throw uploadFailure('DATABASE_ERROR', 'Failed to save the uploaded media record', 500)
    }
  }

  /** storage.put() 失败时不写 DB；保留 409（对象已存在）这类稳定错误 */
  private async storeObject(objectKey: string, validated: ValidatedUpload): Promise<StoredObject> {
    try {
      return await this.storage.put({
        key: objectKey,
        body: validated.buffer,
        contentType: validated.mimeType,
      })
    } catch (error) {
      if (error instanceof AppError && error.status === 409) {
        throw error
      }

      throw uploadFailure('STORAGE_WRITE_FAILED', 'Failed to store the uploaded file', 500)
    }
  }

  /**
   * DB 写入失败的补偿：删除刚写入的对象。
   * 补偿也失败时不向客户端泄露细节，只记录结构化日志（objectKey / DB error / compensation error）。
   */
  private async compensateFailedUpload(objectKey: string, databaseError: unknown): Promise<void> {
    try {
      await this.storage.delete(objectKey)
    } catch (compensationError) {
      this.logger.error(
        JSON.stringify({
          event: 'media.upload.compensation_failed',
          objectKey,
          databaseError: describeError(databaseError),
          compensationError: describeError(compensationError),
        }),
      )
    }
  }
}

/** 只提取稳定、可诊断的字段；不输出文件内容与磁盘路径 */
function describeError(error: unknown): { name?: string; code?: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: (error as { code?: string }).code,
      message: error.message,
    }
  }

  return { message: typeof error === 'string' ? error : 'Unknown error' }
}
