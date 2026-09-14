import argon2 from 'argon2'

/**
 * 生产数据库 Admin 初始化（Phase 5-D）。
 *
 * 目标：在**全新空数据库**上创建唯一的管理员账号，且：
 * - 不接受开发默认账号（admin@example.com / dev-only-password）
 * - 不接受弱密码，凭据只来自环境变量
 * - 使用与登录相同的 argon2 哈希机制（auth.service 用 argon2.verify 校验）
 * - 重复执行时安全失败，绝不创建重复账号或半成品状态
 * - 任何错误信息都不包含密码值
 *
 * 本模块只包含纯逻辑（可用单测覆盖）；实际连接数据库的 CLI 见 src/bootstrap-admin.ts。
 */

export const DEV_ONLY_ADMIN_EMAIL = 'admin@example.com'
export const DEV_ONLY_ADMIN_PASSWORD = 'dev-only-password'
export const MIN_ADMIN_PASSWORD_LENGTH = 12

export type AdminBootstrapErrorCode =
  | 'MISSING_EMAIL'
  | 'INVALID_EMAIL'
  | 'MISSING_PASSWORD'
  | 'WEAK_PASSWORD'
  | 'DEV_DEFAULT_NOT_ALLOWED'
  | 'ADMIN_ALREADY_EXISTS'
  | 'VERIFICATION_FAILED'

/** 初始化失败：code 稳定、message 只描述配置键，绝不包含密码值 */
export class AdminBootstrapError extends Error {
  constructor(
    readonly code: AdminBootstrapErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AdminBootstrapError'
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface AdminBootstrapInput {
  email: string
  password: string
  name: string
}

/**
 * 校验并规范化 bootstrap 输入（ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME）。
 * email 统一小写，与 UsersService.findByEmail 的查询方式保持一致。
 */
export function validateAdminBootstrapEnv(
  env: Record<string, string | undefined>,
): AdminBootstrapInput {
  const email = (env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = env.ADMIN_PASSWORD ?? ''
  const name = (env.ADMIN_NAME ?? '').trim() || 'Admin'

  if (email.length === 0) {
    throw new AdminBootstrapError('MISSING_EMAIL', 'ADMIN_EMAIL is required')
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new AdminBootstrapError('INVALID_EMAIL', 'ADMIN_EMAIL must be a valid email address')
  }

  if (email === DEV_ONLY_ADMIN_EMAIL) {
    throw new AdminBootstrapError(
      'DEV_DEFAULT_NOT_ALLOWED',
      `ADMIN_EMAIL must not be the development default (${DEV_ONLY_ADMIN_EMAIL})`,
    )
  }

  if (password.length === 0) {
    throw new AdminBootstrapError('MISSING_PASSWORD', 'ADMIN_PASSWORD is required')
  }

  if (password === DEV_ONLY_ADMIN_PASSWORD) {
    throw new AdminBootstrapError(
      'DEV_DEFAULT_NOT_ALLOWED',
      'ADMIN_PASSWORD must not be the development default value',
    )
  }

  if (password.trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new AdminBootstrapError(
      'WEAK_PASSWORD',
      `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    )
  }

  return { email, password, name }
}

export interface AdminBootstrapWriter {
  createAdmin(data: {
    email: string
    passwordHash: string
    name: string
  }): Promise<{ id: string; email: string }>
  /** 可选：创建后回读并校验哈希可用于登录（生产 CLI 会提供） */
  verifyPassword?(email: string, password: string): Promise<boolean>
}

/**
 * 创建管理员：
 * 1. argon2 哈希（与 auth.service 的校验方式一致）
 * 2. 单次 create —— email 唯一约束冲突（P2002）时明确失败，不修改任何已有账号
 * 3. 可选回读校验，确保哈希真的能通过登录校验
 */
export async function bootstrapAdmin(
  input: AdminBootstrapInput,
  writer: AdminBootstrapWriter,
): Promise<{ id: string; email: string }> {
  const passwordHash = await argon2.hash(input.password)

  let created: { id: string; email: string }

  try {
    created = await writer.createAdmin({
      email: input.email,
      passwordHash,
      name: input.name,
    })
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'P2002') {
      throw new AdminBootstrapError(
        'ADMIN_ALREADY_EXISTS',
        `An account with email ${input.email} already exists — no changes were made`,
      )
    }

    throw error
  }

  if (writer.verifyPassword) {
    const verified = await writer.verifyPassword(input.email, input.password)

    if (!verified) {
      throw new AdminBootstrapError(
        'VERIFICATION_FAILED',
        'The created admin could not be verified with the provided password',
      )
    }
  }

  return created
}

/** 只输出 host:port/database —— 绝不输出用户、密码或查询参数 */
export function describeDatabaseTarget(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl)
    const database = url.pathname.replace(/^\//, '') || '(default)'

    return `${url.hostname}:${url.port || '5432'}/${database}`
  } catch {
    return '(unparsable DATABASE_URL)'
  }
}
