/**
 * Admin Bootstrap CLI（Phase 5-D）——一次性命令，**不参与应用启动流程**。
 *
 * 用途：在全新空的生产数据库执行 `prisma migrate deploy` 之后，创建唯一管理员账号。
 *
 * 运行方式（编译后的生产镜像内已包含本文件）：
 *   docker compose -f docker-compose.prod.yml exec backend node dist/bootstrap-admin.js
 * 本地（需先构建）：
 *   pnpm --filter backend build
 *   pnpm --filter backend admin:bootstrap
 *
 * 必填环境变量：DATABASE_URL、ADMIN_EMAIL、ADMIN_PASSWORD（可选 ADMIN_NAME）。
 * 安全：不接受开发默认账号、不打印密码、重复执行时明确失败且不修改既有账号。
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import {
  AdminBootstrapError,
  bootstrapAdmin,
  describeDatabaseTarget,
  validateAdminBootstrapEnv,
} from './modules/users/admin-bootstrap.js'

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new AdminBootstrapError('MISSING_EMAIL', 'DATABASE_URL is not set')
  }

  // 配置校验在建立连接之前完成：配置错误不会触碰数据库
  const input = validateAdminBootstrapEnv(process.env)

  // 只打印目标库的 host/database，不含凭据
  console.log(`[admin:bootstrap] target database: ${describeDatabaseTarget(databaseUrl)}`)

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

  try {
    const created = await bootstrapAdmin(input, {
      createAdmin: (data) =>
        prisma.user.create({
          data: { ...data, role: 'ADMIN', isActive: true },
          select: { id: true, email: true },
        }),
      // 创建后回读校验：确保哈希能被 argon2.verify 通过（与登录同一机制）
      verifyPassword: async (email, password) => {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { passwordHash: true },
        })

        return Boolean(user) && (await argon2.verify(user!.passwordHash, password).catch(() => false))
      },
    })

    console.log(`[admin:bootstrap] created admin ${created.email} (id ${created.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof AdminBootstrapError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'unknown error'

  // 绝不输出密码或连接串
  console.error(`[admin:bootstrap] failed — ${message}`)
  process.exitCode = 1
})
