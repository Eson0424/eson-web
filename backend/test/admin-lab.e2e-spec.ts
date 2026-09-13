import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'

/**
 * Admin Lab CMS E2E（需要真实 PostgreSQL）。
 * 重点：Admin 写入 → Public Lab API 立即反映；status / locale / slug / 关系 / 冲突行为。
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

describeWithDatabase('Admin Lab CMS (e2e)', () => {
  let app: INestApplication
  let token = ''
  const createdIds: string[] = []

  const api = () => request(app.getHttpServer())
  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    (api() as unknown as Record<string, (path: string) => request.Test>)[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    )

  async function createLab(payload: Record<string, unknown>) {
    const response = await asAdmin('post', '/api/v1/admin/labs').send(payload)

    if (response.status === 201) {
      createdIds.push(response.body.data.id)
    }

    return response
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
      await asAdmin('delete', `/api/v1/admin/labs/${id}`)
    }

    await app?.close()
  })

  it('rejects anonymous access to every admin lab endpoint', async () => {
    const list = await api().get('/api/v1/admin/labs')
    const detail = await api().get('/api/v1/admin/labs/11111111-1111-4111-8111-111111111111')
    const create = await api().post('/api/v1/admin/labs').send({})
    const patch = await api().patch('/api/v1/admin/labs/11111111-1111-4111-8111-111111111111').send({})
    const remove = await api().delete('/api/v1/admin/labs/11111111-1111-4111-8111-111111111111')

    for (const response of [list, detail, create, patch, remove]) {
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates a DRAFT lab that stays invisible to the Public API', async () => {
    const slug = uniqueSlug('e2e-lab-draft')
    const response = await createLab({
      slug,
      status: 'DRAFT',
      featured: false,
      translations: [
        { locale: 'zh-CN', title: 'E2E 实验草稿', summary: '草稿摘要' },
        { locale: 'en-US', title: 'E2E lab draft', summary: 'Draft summary' },
      ],
    })

    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('DRAFT')
    expect(response.body.data.translations).toHaveLength(2)
    // Lab 没有 start/end date 字段
    expect(response.body.data.startDate).toBeUndefined()

    await api().get(`/api/v1/lab/${slug}`).expect(404)
  })

  it('publishes a lab and makes it visible to the Public API', async () => {
    const slug = uniqueSlug('e2e-lab-published')
    const created = await createLab({
      slug,
      status: 'DRAFT',
      translations: [
        { locale: 'zh-CN', title: 'E2E 实验发布', summary: '摘要' },
        { locale: 'en-US', title: 'E2E lab published', summary: 'Summary' },
      ],
    })

    const published = await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({
      status: 'PUBLISHED',
    })

    expect(published.status).toBe(200)
    expect(published.body.data.publishedAt).toBeTruthy()

    const publicZh = await api().get(`/api/v1/lab/${slug}?locale=zh-CN`).expect(200)
    const publicEn = await api().get(`/api/v1/lab/${slug}?locale=en-US`).expect(200)

    expect(publicZh.body.data.title).toBe('E2E 实验发布')
    expect(publicEn.body.data.title).toBe('E2E lab published')
  })

  it('hides the lab again after PUBLISHED → DRAFT and PUBLISHED → ARCHIVED', async () => {
    const slug = uniqueSlug('e2e-lab-unpublish')
    const created = await createLab({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: 'E2E 状态' }],
    })

    await api().get(`/api/v1/lab/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({ status: 'DRAFT' }).expect(200)
    await api().get(`/api/v1/lab/${slug}`).expect(404)

    await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({ status: 'PUBLISHED' }).expect(200)
    await api().get(`/api/v1/lab/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({ status: 'ARCHIVED' }).expect(200)
    await api().get(`/api/v1/lab/${slug}`).expect(404)
  })

  it('falls back to zh-CN when the requested locale translation is missing', async () => {
    const slug = uniqueSlug('e2e-lab-fallback')

    await createLab({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '仅中文实验' }],
    })

    const response = await api().get(`/api/v1/lab/${slug}?locale=en-US`).expect(200)

    expect(response.body.data.locale).toBe('zh-CN')
    expect(response.body.data.localeFallback).toBe(true)
    expect(response.body.data.title).toBe('仅中文实验')
  })

  it('keeps featured flag and filters accordingly', async () => {
    const slug = uniqueSlug('e2e-lab-featured')

    await createLab({
      slug,
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'zh-CN', title: 'E2E 精选实验' }],
    })

    const featured = await asAdmin('get', '/api/v1/admin/labs?featured=true&pageSize=100').expect(200)

    expect((featured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(true)

    const notFeatured = await asAdmin('get', '/api/v1/admin/labs?featured=false&pageSize=100').expect(200)

    expect((notFeatured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(false)
  })

  it('supports status filter, search, category/tag filter, pagination and sort whitelist', async () => {
    const draft = await asAdmin('get', '/api/v1/admin/labs?status=DRAFT&pageSize=100').expect(200)
    expect((draft.body.data as Array<{ status: string }>).every((item) => item.status === 'DRAFT')).toBe(true)

    const search = await asAdmin('get', '/api/v1/admin/labs?search=agent&pageSize=100').expect(200)
    expect(search.body.meta).toMatchObject({ page: 1 })

    const paginated = await asAdmin('get', '/api/v1/admin/labs?page=1&pageSize=2').expect(200)
    expect(paginated.body.data.length).toBeLessThanOrEqual(2)
    expect(paginated.body.meta.pageSize).toBe(2)

    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const categorySlug = categories.body.data[0].slug as string
    const byCategory = await asAdmin(
      'get',
      `/api/v1/admin/labs?category=${categorySlug}&pageSize=100`,
    ).expect(200)
    expect(byCategory.body.success).toBe(true)

    const tags = await asAdmin('get', '/api/v1/admin/tags').expect(200)
    const tagSlug = tags.body.data[0].slug as string
    const byTag = await asAdmin('get', `/api/v1/admin/labs?tag=${tagSlug}&pageSize=100`).expect(200)
    expect(byTag.body.success).toBe(true)

    // 排序字段受 DTO 白名单保护：非白名单值返回 400 VALIDATION_ERROR
    const badSort = await asAdmin('get', '/api/v1/admin/labs?sort=title&order=desc').expect(400)
    expect(badSort.body.error.code).toBe('VALIDATION_ERROR')

    const goodSort = await asAdmin(
      'get',
      '/api/v1/admin/labs?sort=publishedAt&order=desc&pageSize=100',
    ).expect(200)
    expect(goodSort.body.success).toBe(true)
  })

  it('updates translations, relations and base fields', async () => {
    const slug = uniqueSlug('e2e-lab-update')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const tags = await asAdmin('get', '/api/v1/admin/tags').expect(200)
    const media = await asAdmin('get', '/api/v1/admin/media').expect(200)

    const categoryId = categories.body.data[0].id as string
    const tagId = tags.body.data[0].id as string
    const mediaId = media.body.data[0]?.id as string | undefined

    const created = await createLab({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '更新前' }],
      categoryIds: [],
      tagIds: [],
    })

    const updated = await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({
      featured: true,
      translations: [
        { locale: 'zh-CN', title: '更新后' },
        { locale: 'en-US', title: 'Updated' },
      ],
      categoryIds: [categoryId],
      tagIds: [tagId],
      ...(mediaId ? { mediaIds: [mediaId], coverMediaId: mediaId } : {}),
    })

    expect(updated.status).toBe(200)
    expect(updated.body.data.featured).toBe(true)
    expect(updated.body.data.translations).toHaveLength(2)
    expect(updated.body.data.categoryIds).toEqual([categoryId])
    expect(updated.body.data.tagIds).toEqual([tagId])
    if (mediaId) {
      expect(updated.body.data.mediaIds).toEqual([mediaId])
      expect(updated.body.data.coverMediaId).toBe(mediaId)
    }

    const cleared = await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({
      categoryIds: [],
      tagIds: [],
      mediaIds: [],
    })

    expect(cleared.body.data.categoryIds).toEqual([])
    expect(cleared.body.data.tagIds).toEqual([])
    expect(cleared.body.data.mediaIds).toEqual([])
  })

  it('returns CONFLICT for duplicate slugs without touching existing data', async () => {
    const existing = await asAdmin('get', '/api/v1/admin/labs?pageSize=1').expect(200)
    const existingSlug = existing.body.data[0].slug as string
    const existingId = existing.body.data[0].id as string

    const createConflict = await createLab({
      slug: existingSlug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突' }],
    })

    expect(createConflict.status).toBe(409)
    expect(createConflict.body.error.code).toBe('CONFLICT')

    const slug = uniqueSlug('e2e-lab-conflict')
    const created = await createLab({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突更新' }],
    })

    const updateConflict = await asAdmin('patch', `/api/v1/admin/labs/${created.body.data.id}`).send({
      slug: existingSlug,
    })

    expect(updateConflict.status).toBe(409)
    expect(updateConflict.body.error.code).toBe('CONFLICT')

    const unchanged = await asAdmin('get', `/api/v1/admin/labs/${created.body.data.id}`).expect(200)
    expect(unchanged.body.data.slug).toBe(slug)

    const original = await asAdmin('get', `/api/v1/admin/labs/${existingId}`).expect(200)
    expect(original.body.data.slug).toBe(existingSlug)
  })

  it('deletes a lab, cleans join records and keeps taxonomy/media rows', async () => {
    const slug = uniqueSlug('e2e-lab-delete')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const categoryId = categories.body.data[0].id as string
    const categoriesBefore = categories.body.data.length

    const created = await createLab({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '待删除' }],
      categoryIds: [categoryId],
    })

    await api().get(`/api/v1/lab/${slug}`).expect(200)

    const deleted = await asAdmin('delete', `/api/v1/admin/labs/${created.body.data.id}`).expect(200)
    expect(deleted.body.data).toEqual({ id: created.body.data.id, deleted: true })

    await asAdmin('get', `/api/v1/admin/labs/${created.body.data.id}`).expect(404)
    await api().get(`/api/v1/lab/${slug}`).expect(404)

    const categoriesAfter = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    expect(categoriesAfter.body.data.length).toBe(categoriesBefore)

    createdIds.splice(createdIds.indexOf(created.body.data.id), 1)
  })

  it('validates slugs, status, locale and unknown ids', async () => {
    const invalidSlug = await createLab({
      slug: 'Not Valid Slug',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '非法 slug' }],
    })

    expect(invalidSlug.status).toBe(400)
    expect(invalidSlug.body.error.code).toBe('VALIDATION_ERROR')

    const invalidLocale = await createLab({
      slug: uniqueSlug('e2e-lab-locale'),
      status: 'DRAFT',
      translations: [{ locale: 'fr-FR', title: 'invalide' }],
    })

    expect(invalidLocale.status).toBe(400)

    const missing = await asAdmin('get', '/api/v1/admin/labs/11111111-1111-4111-8111-111111111111')
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')

    const badId = await asAdmin('get', '/api/v1/admin/labs/not-a-uuid')
    expect(badId.status).toBe(400)
    expect(badId.body.error.code).toBe('VALIDATION_ERROR')
  })
})
