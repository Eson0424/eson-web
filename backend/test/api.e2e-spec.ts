import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'

/**
 * API integration tests（需要真实 PostgreSQL）。
 *
 * 本机没有 PostgreSQL 时自动跳过，绝不用 mock 数据伪造通过结果。
 * 运行前置：DATABASE_URL 指向已 migrate + seed 的数据库。
 */
const databaseUrl = process.env.DATABASE_URL
const describeWithDatabase = databaseUrl ? describe : describe.skip

describeWithDatabase('Public API (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('returns the success envelope for the work list', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/work?locale=zh-CN').expect(200)

    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 12 })
  })

  it('never exposes draft or archived work', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/work?pageSize=100').expect(200)
    const slugs = (response.body.data as Array<{ slug: string }>).map((item) => item.slug)

    expect(slugs).not.toContain('draft-work')
    expect(slugs).not.toContain('archived-work')
  })

  it('falls back to zh-CN when the requested locale is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/work/design-system-toolkit?locale=en-US')
      .expect(200)

    expect(response.body.data.locale).toBe('zh-CN')
    expect(response.body.data.localeFallback).toBe(true)
  })

  it('returns the error envelope with NOT_FOUND for an unknown slug', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/work/does-not-exist').expect(404)

    expect(response.body).toMatchObject({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND' },
      meta: null,
    })
  })

  it('rejects invalid contact payloads with VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact')
      .send({ name: '', email: 'not-an-email', subject: '', message: '' })
      .expect(400)

    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('reports database health honestly', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health')

    expect(response.body.data.process).toBe('up')
    expect(['up', 'down']).toContain(response.body.data.database)
  })

  it('returns published lab entries only and 404 for draft slugs', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/lab?pageSize=100').expect(200)
    const slugs = (list.body.data as Array<{ slug: string }>).map((item) => item.slug)

    expect(slugs).toContain('agent-workflow-prototype')
    expect(slugs).not.toContain('draft-lab')
    expect(slugs).not.toContain('archived-lab')

    await request(app.getHttpServer()).get('/api/v1/lab/draft-lab').expect(404)
  })

  it('sorts writing by publishedAt DESC and hides non-published entries', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/writing?pageSize=100&locale=zh-CN')
      .expect(200)

    const items = response.body.data as Array<{ slug: string; publishedAt: string }>
    const dates = items.map((item) => new Date(item.publishedAt).getTime())

    expect(items.map((item) => item.slug)).not.toContain('draft-writing')
    expect([...dates].sort((a, b) => b - a)).toEqual(dates)
  })

  /**
   * Experience 是 Public API 发布规则的明确例外：
   * experiences 没有 status / published_at，因此写入即可见（docs/API.md §13）。
   * 这里验证真实 response 结构、稳定排序与 locale fallback 约定。
   */
  it('returns the experience timeline with localized entries and no publish fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience?locale=zh-CN&pageSize=100')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.length).toBeGreaterThan(0)
    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 100 })
    expect(response.body.meta.total).toBeGreaterThanOrEqual(response.body.data.length)

    for (const entry of response.body.data as Array<Record<string, unknown>>) {
      expect(typeof entry.id).toBe('string')
      expect(typeof entry.role).toBe('string')
      expect(typeof entry.isCurrent).toBe('boolean')
      expect(['zh-CN', 'en-US']).toContain(entry.locale)
      expect(typeof entry.localeFallback).toBe('boolean')
      // Experience 没有 status / publishedAt（公开规则的例外，不得凭空出现）
      expect(entry).not.toHaveProperty('status')
      expect(entry).not.toHaveProperty('publishedAt')
      // fallback 只回落到 zh-CN，不会回落到其它语言
      if (entry.localeFallback === true) {
        expect(entry.locale).toBe('zh-CN')
      }
    }
  })

  it('keeps experience ordering deterministic across pages', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/api/v1/experience?page=1&pageSize=1&locale=zh-CN')
      .expect(200)
    const secondPage = await request(app.getHttpServer())
      .get('/api/v1/experience?page=2&pageSize=1&locale=zh-CN')
      .expect(200)

    expect(firstPage.body.data).toHaveLength(1)
    expect(secondPage.body.data).toHaveLength(1)
    expect(secondPage.body.data[0].id).not.toBe(firstPage.body.data[0].id)
  })

  it('resolves an unsupported locale to zh-CN for the experience timeline', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience?pageSize=100')
      .set('Accept-Language', 'fr-FR')
      .expect(200)

    expect(response.body.data.length).toBeGreaterThan(0)

    for (const entry of response.body.data as Array<Record<string, unknown>>) {
      expect(entry.locale).toBe('zh-CN')
    }
  })

  it('returns localized categories and tags', async () => {
    const categories = await request(app.getHttpServer())
      .get('/api/v1/categories?locale=en-US')
      .expect(200)
    const tags = await request(app.getHttpServer()).get('/api/v1/tags?locale=zh-CN').expect(200)

    expect(categories.body.data[0]).toHaveProperty('slug')
    expect(categories.body.data[0]).toHaveProperty('name')
    expect(tags.body.data.length).toBeGreaterThan(0)
  })

  it('exposes only whitelisted public settings', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/settings/public').expect(200)
    const keys = Object.keys(response.body.data as Record<string, unknown>)

    expect(keys).toContain('site.title')
    expect(keys).not.toContain('site.secret')
  })

  it('rejects login with invalid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password-value' })
      .expect(401)

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('logs in with the seeded admin, issues an HttpOnly refresh cookie and returns /auth/me', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'dev-only-password' })
      .expect(200)

    expect(login.body.data.accessToken).toBeTypeOf('string')
    // refresh token 只通过 Set-Cookie 下发，不进入响应体
    expect(JSON.stringify(login.body)).not.toContain('refreshToken')

    const cookies = login.headers['set-cookie'] as unknown as string[]
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refresh_token='))

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200)

    expect(me.body.data).toMatchObject({ email: 'admin@example.com', role: 'ADMIN' })

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie!.split(';')[0])
      .expect(200)

    expect(refreshed.body.data.accessToken).toBeTypeOf('string')
  })

  it('requires a bearer token for protected endpoints', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401)

    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('stores a contact message and reports the receipt without leaking the raw IP', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact')
      .send({
        name: 'E2E Sender',
        email: 'e2e.sender@example.com',
        subject: 'E2E enquiry',
        message: 'A message created by the API integration test.',
      })
      .expect(201)

    expect(response.body.data).toMatchObject({ status: 'UNREAD' })
    expect(JSON.stringify(response.body)).not.toContain('127.0.0.1')
  })

  it('applies the contact rate limit foundation', async () => {
    const payload = {
      name: 'E2E Sender',
      email: 'e2e.sender@example.com',
      subject: 'Rate limit probe',
      message: 'Probing the contact rate limiter until it rejects.',
    }

    const statuses: number[] = []

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(app.getHttpServer()).post('/api/v1/contact').send(payload)
      statuses.push(response.status)
    }

    expect(statuses).toContain(429)
  })

  it('rejects anonymous access to admin statistics', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/stats').expect(401)

    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns real admin statistics for an authenticated admin', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'dev-only-password' })
      .expect(200)

    const stats = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200)

    // 结构与非负整数校验：vitest 会并行跑 e2e 文件，Admin Work 用例会临时增删 Work，
    // 因此这里断言真实存在的形状与 seed 下限，而不是绑定精确计数。
    for (const count of [
      stats.body.data.works.published,
      stats.body.data.works.draft,
      stats.body.data.works.archived,
      stats.body.data.labs.published,
      stats.body.data.writings.published,
      stats.body.data.experiences.total,
      stats.body.data.messages.unread,
      stats.body.data.messages.total,
      stats.body.data.media.total,
    ]) {
      expect(Number.isInteger(count)).toBe(true)
      expect(count).toBeGreaterThanOrEqual(0)
    }

    // seed 至少有 4 published / 1 draft / 1 archived work
    expect(stats.body.data.works.published).toBeGreaterThanOrEqual(4)
    expect(stats.body.data.works.draft).toBeGreaterThanOrEqual(1)
    expect(stats.body.data.works.archived).toBeGreaterThanOrEqual(1)
    expect(stats.body.data.messages.unread).toBeGreaterThanOrEqual(1)
    expect(stats.body.data.experiences.total).toBeGreaterThan(0)
  })

  it('logs out and clears the refresh cookie', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(200)

    expect(response.body.data).toEqual({ loggedOut: true })

    const cookies = response.headers['set-cookie'] as unknown as string[] | undefined

    expect(cookies?.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true)
  })
})
