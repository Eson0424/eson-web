import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common'
import { AdminRoleGuard, JwtAuthGuard } from '../auth/jwt-auth.guard.js'
import { MAX_UPLOAD_BYTES } from './image-inspection.js'
import { mapMultipartValidationError } from './media-errors.js'
import { toAdminMediaView } from './media.mapper.js'
import { MediaService } from './media.service.js'
import { AdminMediaQueryDto } from './dto/admin-media-query.dto.js'
import { UpdateMediaDto } from './dto/update-media.dto.js'
import { UploadMediaDto } from './dto/upload-media.dto.js'
import { MediaUploadExceptionFilter } from './media-upload-exception.filter.js'

/** multer 内存存储解析出的文件（只取需要的字段，避免引入 @types/multer） */
export interface UploadedMediaFile {
  fieldname?: string
  originalname?: string
  mimetype: string
  size: number
  buffer?: Buffer
}

/** transport 层允许的 MIME（service 层仍会做 magic bytes / 一致性 / 尺寸的权威校验） */
export const MULTIPART_ALLOWED_MIME_PATTERN = /^image\/(jpeg|png|webp|avif)$/

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'Admin media list（分页，createdAt DESC）' })
  @ApiOkResponse({ description: 'Paginated media library' })
  list(@Query() query: AdminMediaQueryDto) {
    return this.media.listForAdmin(query)
  }

  @Post()
  @ApiOperation({ summary: 'Upload media（multipart/form-data：file + alt?）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @UseFilters(MediaUploadExceptionFilter)
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        // 缺失文件交给 service 报 FILE_MISSING，保持错误码一致
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
          // fallbackToMimetype：内容类型无法识别时不在这里下结论，
          // 交给 MediaService（权威校验）返回更精确的 SIGNATURE_MISMATCH
          new FileTypeValidator({
            fileType: MULTIPART_ALLOWED_MIME_PATTERN,
            fallbackToMimetype: true,
          }),
        ],
        exceptionFactory: (error: string) => mapMultipartValidationError(error),
      }),
    )
    file: UploadedMediaFile | undefined,
    @Body() body: UploadMediaDto,
  ) {
    // transport 层只做粗筛；MediaService.upload() 是最终权威校验
    const media = await this.media.upload({
      buffer: file?.buffer,
      declaredMimeType: file?.mimetype,
      originalFilename: file?.originalname,
      alt: body.alt,
    })

    return toAdminMediaView(media)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media metadata（仅 alt）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateMediaDto) {
    const media = await this.media.updateMetadata(id, dto)

    return toAdminMediaView(media)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media（被引用 → 409 MEDIA_IN_USE；先删存储再删 DB）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.media.remove(id)
  }
}
