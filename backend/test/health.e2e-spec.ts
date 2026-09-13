import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/health returns the standard success envelope', async () => {
    // 数据库不可用时必须返回 503 + degraded，而不是伪造 healthy（Phase 3 §15）
    const response = await request(app.getHttpServer()).get('/api/v1/health')

    expect([200, 503]).toContain(response.status)
    expect(response.body.success).toBe(true)
    expect(response.body.data.process).toBe('up')
    expect(['up', 'down']).toContain(response.body.data.database)
    expect(response.body.meta).toBeNull()
  })
})
