import { Catch, HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common'
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter.js'
import { mapMulterError } from './media-errors.js'
import { uploadFailure } from './upload-validation.js'

/**
 * multipart 传输层错误映射（Phase 4-F.3）。
 *
 * multer 在超过 `limits.fileSize` 时会抛出 `LIMIT_FILE_SIZE`，
 * 默认会被全局过滤器当成未知错误 → 500。这里把它转换成与 service 层一致的
 * `FILE_UPLOAD_ERROR` 422 + reason `FILE_TOO_LARGE`，其余 multer 限制错误 → 400 `MALFORMED_UPLOAD`。
 */
@Catch()
export class MediaUploadExceptionFilter extends AllExceptionsFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const code = (exception as { code?: unknown } | null)?.code

    if (typeof code === 'string' && code.startsWith('LIMIT_')) {
      super.catch(mapMulterError(code), host)

      return
    }

    // Nest 把 multer 的 LIMIT_FILE_SIZE 包装成 413 PayloadTooLargeException
    if (exception instanceof HttpException && exception.getStatus() === HttpStatus.PAYLOAD_TOO_LARGE) {
      super.catch(uploadFailure('FILE_TOO_LARGE', 'File exceeds the 10MB limit', 422), host)

      return
    }

    super.catch(exception, host)
  }
}
