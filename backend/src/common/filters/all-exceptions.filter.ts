import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ERROR_CODES, AppError, type ErrorCode } from '../errors/app-error.js'
import type { ApiErrorEnvelope } from '../types/api-response.js'

interface PrismaKnownError {
  code?: string
  meta?: Record<string, unknown>
}

/** 统一错误响应：{ success: false, data: null, error, meta: null }（docs/API.md §6） */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()

    const { status, code, message, details } = this.resolve(exception)

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // 生产环境不返回 stack trace，仅记录服务端日志
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${code}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    const body: ApiErrorEnvelope = {
      success: false,
      data: null,
      error: { code, message, details },
      meta: null,
    }

    response.status(status).json(body)
  }

  private resolve(exception: unknown): {
    status: number
    code: ErrorCode
    message: string
    details: unknown[]
  } {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()
      const details = extractValidationDetails(payload)

      return {
        status,
        code: statusToCode(status, details.length > 0),
        message: extractMessage(payload, exception.message),
        details,
      }
    }

    const prismaCode = (exception as PrismaKnownError | null)?.code

    if (prismaCode === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: ERROR_CODES.CONFLICT,
        message: 'Resource already exists',
        details: [],
      }
    }

    if (prismaCode === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Resource not found',
        details: [],
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
      details: [],
    }
  }
}

function statusToCode(status: number, hasValidationDetails: boolean): ErrorCode {
  if (hasValidationDetails) {
    return ERROR_CODES.VALIDATION_ERROR
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ERROR_CODES.VALIDATION_ERROR
    case HttpStatus.UNAUTHORIZED:
      return ERROR_CODES.UNAUTHORIZED
    case HttpStatus.FORBIDDEN:
      return ERROR_CODES.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ERROR_CODES.NOT_FOUND
    case HttpStatus.CONFLICT:
      return ERROR_CODES.CONFLICT
    case HttpStatus.TOO_MANY_REQUESTS:
      return ERROR_CODES.RATE_LIMITED
    default:
      return ERROR_CODES.INTERNAL_ERROR
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string') {
    return payload
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message

    if (typeof message === 'string') {
      return message
    }

    if (Array.isArray(message)) {
      return 'Invalid request'
    }
  }

  return fallback
}

function extractValidationDetails(payload: unknown): unknown[] {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message

    if (Array.isArray(message)) {
      return message as unknown[]
    }
  }

  return []
}
