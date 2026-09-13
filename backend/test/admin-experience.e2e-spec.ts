import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'

/**
 * Admin Experience CMS E2E（需要真实 PostgreSQL）。
 *
 * Experience 与 Work / Lab / Writing 的关键差异：
 * - 没有 slug / status / publishedAt → 写入后 Public 立即可见，没有草稿态
 * - 没有 categories / tags / media 关系
 * - isCurrent 与 endDate 互斥（400 VALIDATION_ERROR）
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

const MARKER = `e2eqa${Date.now().toString(36)}`

describeWithDatabase('Admin Experience CMS (e2e)', () => {
  let app: INestApplication
  let token = ''
  const createdIds: string[] = []

  const api = () => request(app.getHttpServer())
  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    (api() as unknown as Record<string, (path: string) => request.Test>)[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    )

  async function createExperience(payload: Record<string, unknown>) {
    const response = await asAdmin('post', '/api/v1/admin/experiences').send(payload)

    if (response.status === 201) {
      createdIds.push(response.body.data.id)
    }

    return response
  }

  async function publicList(query = '') {
    const response = await api().get(`/api/v1/experience?pageSize=100${query}`).expect(200)

    return response.body.data as Array<Record<string, unknown>>
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'dev-only-password' })

    token = login.body.data.accessToken
  })

  afterAll(async () => {
    for (const id of createdIds) {
      await asAdmin('delete', `/api/v1/admin/experiences/${id}`)
    }

    await app?.close()
  })

  it('rejects anonymous access to every admin experience endpoint', async () => {
    const list = await api().get('/api/v1/admin/experiences')
    const detail = await api().get('/api/v1/admin/experiences/11111111-1111-4111-8111-111111111111')
    const create = await api().post('/api/v1/admin/experiences').send({})
    const patch = await api()
      .patch('/api/v1/admin/experiences/11111111-1111-4111-8111-111111111111')
      .send({})
    const remove = await api().delete(
      '/api/v1/admin/experiences/11111111-1111-4111-8111-111111111111',
    )

    for (const response of [list, detail, create, patch, remove]) {
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates an experience that is immediately visible on the Public API', async () => {
    const created = await createExperience({
      sortOrder: 20,
      employmentType: 'FULL_TIME',
      location: `Remote-${MARKER}`,
      startDate: '2020-01-01',
      isCurrent: true,
      translations: [
        {
          locale: 'zh-CN',
          roleName: `高级工程师 ${MARKER}`,
          companyName: `示例公司 ${MARKER}`,
          summary: '负责平台工程与交付。',
          content: '详细职责说明。',
        },
        { locale: 'en-US', roleName: `Senior Engineer ${MARKER}` },
      ],
    })

    expect(created.status).toBe(201)
    expect(created.body.data.isCurrent).toBe(true)
    expect(created.body.data.endDate).toBeNull()
    expect(created.body.data.translations).toHaveLength(2)
    expect(created.body.data).not.toHaveProperty('status')
    expect(created.body.data).not.toHaveProperty('publishedAt')
    // 展示字段只存在于 translations（顶层 company / role 由服务层显式不写）

    const items = await publicList()
    const published = items.find((item) => item.id === created.body.data.id)

    expect(published).toBeDefined()
    expect(published?.company).toBe(`示例公司 ${MARKER}`)
    expect(published?.role).toBe(`高级工程师 ${MARKER}`)
    expect(published?.isCurrent).toBe(true)
    expect(published?.location).toBe(`Remote-${MARKER}`)
  })

  it('falls back to zh-CN on the Public API when en-US is missing', async () => {
    const created = await createExperience({
      sortOrder: 21,
      translations: [{ locale: 'zh-CN', roleName: `仅中文经历 ${MARKER}` }],
    })

    const response = await api()
      .get(`/api/v1/experience?pageSize=100&locale=en-US`)
      .expect(200)
    const entry = (response.body.data as Array<Record<string, unknown>>).find(
      (item) => item.id === created.body.data.id,
    )

    expect(entry?.locale).toBe('zh-CN')
    expect(entry?.localeFallback).toBe(true)
    expect(entry?.role).toBe(`仅中文经历 ${MARKER}`)
    // 未提供公司时不伪造
    expect(entry).not.toHaveProperty('company')
  })

  it('updates fields and translations without breaking atomicity', async () => {
    const created = await createExperience({
      sortOrder: 30,
      startDate: '2019-01-01',
      endDate: '2021-12-31',
      translations: [{ locale: 'zh-CN', roleName: `待更新 ${MARKER}`, companyName: `旧公司 ${MARKER}` }],
    })

    const updated = await asAdmin('patch', `/api/v1/admin/experiences/${created.body.data.id}`).send({
      sortOrder: 31,
      employmentType: 'CONTRACT',
      isCurrent: true,
      endDate: null,
      translations: [
        { locale: 'zh-CN', roleName: `更新后 ${MARKER}`, companyName: `新公司 ${MARKER}`, summary: '新摘要' },
        { locale: 'en-US', roleName: `Updated ${MARKER}` },
      ],
    })

    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({ sortOrder: 31, employmentType: 'CONTRACT', isCurrent: true })
    expect(updated.body.data.endDate).toBeNull()
    expect(updated.body.data.translations).toHaveLength(2)
    expect(
      (updated.body.data.translations as Array<Record<string, unknown>>).find(
        (translation) => translation.locale === 'zh-CN',
      ),
    ).toMatchObject({ roleName: `更新后 ${MARKER}`, companyName: `新公司 ${MARKER}`, summary: '新摘要' })

    const items = await publicList()
    const published = items.find((item) => item.id === created.body.data.id)

    expect(published?.company).toBe(`新公司 ${MARKER}`)
  })

  it('rejects isCurrent combined with endDate on create and update', async () => {
    const createConflict = await createExperience({
      isCurrent: true,
      endDate: '2025-01-01',
      translations: [{ locale: 'zh-CN', roleName: `冲突 ${MARKER}` }],
    })

    expect(createConflict.status).toBe(400)
    expect(createConflict.body.error.code).toBe('VALIDATION_ERROR')

    const created = await createExperience({
      isCurrent: true,
      translations: [{ locale: 'zh-CN', roleName: `当前任职 ${MARKER}` }],
    })

    const updateConflict = await asAdmin(
      'patch',
      `/api/v1/admin/experiences/${created.body.data.id}`,
    ).send({ endDate: '2026-01-01' })

    expect(updateConflict.status).toBe(400)
    expect(updateConflict.body.error.code).toBe('VALIDATION_ERROR')

    const unchanged = await asAdmin('get', `/api/v1/admin/experiences/${created.body.data.id}`).expect(200)

    expect(unchanged.body.data.endDate).toBeNull()
    expect(unchanged.body.data.isCurrent).toBe(true)
  })

  it('validates dates, employment type, locales and unknown fields', async () => {
    const reversed = await createExperience({
      startDate: '2025-01-01',
      endDate: '2024-01-01',
      translations: [{ locale: 'zh-CN', roleName: `日期反了 ${MARKER}` }],
    })

    expect(reversed.status).toBe(400)

    const badEmploymentType = await createExperience({
      employmentType: 'INTERN',
      translations: [{ locale: 'zh-CN', roleName: `非法类型 ${MARKER}` }],
    })

    expect(badEmploymentType.status).toBe(400)
    expect(badEmploymentType.body.error.code).toBe('VALIDATION_ERROR')

    const duplicateLocale = await createExperience({
      translations: [
        { locale: 'zh-CN', roleName: `重复 ${MARKER}` },
        { locale: 'zh-CN', roleName: `重复 2 ${MARKER}` },
      ],
    })

    expect(duplicateLocale.status).toBe(400)
    expect(duplicateLocale.body.error.code).toBe('VALIDATION_ERROR')

    const badLocale = await createExperience({
      translations: [{ locale: 'fr-FR', roleName: 'Ingénieur' }],
    })

    expect(badLocale.status).toBe(400)

    const missingRole = await createExperience({
      translations: [{ locale: 'zh-CN' }],
    })

    expect(missingRole.status).toBe(400)

    // slug / status 等 Work / Lab / Writing 字段必须被拒绝而不是忽略
    const workOnlyField = await createExperience({
      slug: 'some-slug',
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', roleName: `未知字段 ${MARKER}` }],
    })

    expect(workOnlyField.status).toBe(400)
    expect(workOnlyField.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('supports search over roleName / companyName / location', async () => {
    const byRole = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(`高级工程师 ${MARKER}`)}&pageSize=100`,
    ).expect(200)

    expect((byRole.body.data as Array<{ id: string }>).length).toBeGreaterThanOrEqual(1)

    const byCompany = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(`新公司 ${MARKER}`)}&pageSize=100`,
    ).expect(200)

    expect((byCompany.body.data as Array<{ id: string }>).length).toBeGreaterThanOrEqual(1)

    const byLocation = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(`Remote-${MARKER}`)}&pageSize=100`,
    ).expect(200)

    expect((byLocation.body.data as Array<{ id: string }>).length).toBeGreaterThanOrEqual(1)
  })

  it('supports pagination and the Experience sort whitelist', async () => {
    const paginated = await asAdmin('get', '/api/v1/admin/experiences?page=1&pageSize=1').expect(200)

    expect(paginated.body.data.length).toBeLessThanOrEqual(1)
    expect(paginated.body.meta.pageSize).toBe(1)

    const bySortOrder = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(MARKER)}&sort=sortOrder&order=asc&pageSize=100`,
    ).expect(200)
    const sortOrders = (bySortOrder.body.data as Array<{ sortOrder: number }>).map((item) => item.sortOrder)

    expect([...sortOrders].sort((a, b) => a - b)).toEqual(sortOrders)

    const byStartDate = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(MARKER)}&sort=startDate&order=desc&pageSize=100`,
    ).expect(200)
    const startDates = (byStartDate.body.data as Array<{ startDate: string | null }>)
      .map((item) => item.startDate)
      .filter((value): value is string => Boolean(value))

    expect([...startDates].sort((a, b) => (a < b ? 1 : -1))).toEqual(startDates)

    const defaultOrder = await asAdmin(
      'get',
      `/api/v1/admin/experiences?search=${encodeURIComponent(MARKER)}&pageSize=100`,
    ).expect(200)
    const defaultSortOrders = (defaultOrder.body.data as Array<{ sortOrder: number }>).map(
      (item) => item.sortOrder,
    )

    expect([...defaultSortOrders].sort((a, b) => a - b)).toEqual(defaultSortOrders)

    // Experience 没有 publishedAt 列：不允许用共享白名单的排序字段
    const badSort = await asAdmin('get', '/api/v1/admin/experiences?sort=publishedAt').expect(400)

    expect(badSort.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('deletes an experience together with its translations', async () => {
    const created = await createExperience({
      sortOrder: 99,
      translations: [{ locale: 'zh-CN', roleName: `待删除 ${MARKER}`, companyName: `删除公司 ${MARKER}` }],
    })

    const beforeDelete = await publicList()

    expect(beforeDelete.some((item) => item.id === created.body.data.id)).toBe(true)

    const deleted = await asAdmin('delete', `/api/v1/admin/experiences/${created.body.data.id}`).expect(200)

    expect(deleted.body.data).toEqual({ id: created.body.data.id, deleted: true })

    await asAdmin('get', `/api/v1/admin/experiences/${created.body.data.id}`).expect(404)

    const afterDelete = await publicList()

    expect(afterDelete.some((item) => item.id === created.body.data.id)).toBe(false)

    createdIds.splice(createdIds.indexOf(created.body.data.id), 1)
  })

  it('returns NOT_FOUND for unknown ids and VALIDATION_ERROR for non-uuid ids', async () => {
    const missing = await asAdmin('get', '/api/v1/admin/experiences/11111111-1111-4111-8111-111111111111')

    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')

    const badId = await asAdmin('get', '/api/v1/admin/experiences/not-a-uuid')

    expect(badId.status).toBe(400)
    expect(badId.body.error.code).toBe('VALIDATION_ERROR')
  })
})
