/** 稳定错误码（docs/API.md §6、AGENTS §59） */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  RESOURCE_PUBLISHED: 'RESOURCE_PUBLISHED',
  RESOURCE_ARCHIVED: 'RESOURCE_ARCHIVED',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details: unknown[] = [],
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(message = 'Resource not found') {
  return new AppError(ERROR_CODES.NOT_FOUND, message, 404)
}

export function validationError(message = 'Invalid request', details: unknown[] = []) {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, details)
}

export function conflict(message = 'Resource conflict') {
  return new AppError(ERROR_CODES.CONFLICT, message, 409)
}

export function invalidCredentials(message = 'Invalid credentials') {
  return new AppError(ERROR_CODES.INVALID_CREDENTIALS, message, 401)
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(ERROR_CODES.UNAUTHORIZED, message, 401)
}

export function forbidden(message = 'Forbidden') {
  return new AppError(ERROR_CODES.FORBIDDEN, message, 403)
}

export function invalidToken(message = 'Invalid or expired token') {
  return new AppError(ERROR_CODES.INVALID_TOKEN, message, 401)
}
