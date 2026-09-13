// NestJS / class-transformer 需要 reflect-metadata 在所有测试之前加载
import 'reflect-metadata'
// 让 e2e 测试可以直接读取 backend/.env（DATABASE_URL 等）
import 'dotenv/config'
