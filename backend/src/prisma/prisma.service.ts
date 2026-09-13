import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { readEnv } from '../config/env.js'

/**
 * Prisma 7 运行时要求 driver adapter（不再内置查询引擎）。
 * 连接串来自环境变量，绝不硬编码（AGENTS §39、§23）。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    const env = readEnv()

    super({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) })
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect()
    } catch (error) {
      // 不阻止进程启动：/health 会明确报告数据库不可用，而不是伪造 healthy
      this.logger.error(
        `Database connection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  /** 健康检查：返回数据库连通性，不抛出 */
  async checkConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.$queryRaw`SELECT 1`
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'unknown error' }
    }
  }
}
