import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Prisma 7：连接串与迁移配置从 schema 迁移到本文件。
// 本地开发从 backend/.env 读取 DATABASE_URL（参见根目录 .env.example）。
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    // Node 24 可直接执行 TypeScript（type stripping），无需额外运行时依赖。
    seed: 'node prisma/seed.ts',
  },
})
