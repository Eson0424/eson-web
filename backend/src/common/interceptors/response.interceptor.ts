import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'
import type { PaginationMeta } from '../types/api-response.js'

type ControllerPayload =
  | { data: unknown; meta: PaginationMeta | null }
  | { data: unknown[]; meta: PaginationMeta }
  | unknown

/**
 * 统一成功响应：{ success: true, data, meta }（docs/API.md §5）
 * 控制器返回 `{ data, meta }` 时直接采用，否则整体作为 data。
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: ControllerPayload) => {
        if (isEnvelope(payload)) {
          return { success: true, data: payload.data, meta: payload.meta }
        }

        return { success: true, data: payload ?? null, meta: null }
      }),
    )
  }
}

function isEnvelope(value: unknown): value is { data: unknown; meta: PaginationMeta | null } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    (value as { meta: unknown }).meta !== undefined
  )
}
