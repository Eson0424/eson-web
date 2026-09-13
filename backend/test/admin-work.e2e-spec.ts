import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'

/**
 * Admin Work CMS E2E（需要真实 PostgreSQL）。
 * 重点：Admin 写入 → Public API 立即反映；status / locale / slug / 关系 / 冲突行为。
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

describeWithDatabase('Admin Work CMS (e2e)', () => {
  let app: INestApplication
  let token = ''
  const createdIds: string[] = []
  const createdSlugs: string[] = []

  const api = () => request(app.getHttpServer())
  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    (api() as unknown as Record<string, (path: string) => request.Test>)[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    )

  async function createWork(payload: Record<string, unknown>) {
    const response = await asAdmin('post', '/api/v1/admin/works').send(payload)

    if (response.status === 201) {
      createdIds.push(response.body.data.id)
      createdSlugs.push(response.body.data.slug)
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
      await asAdmin('delete', `/api/v1/admin/works/${id}`)
    }

    await app?.close()
  })

  it('rejects anonymous access to every admin work endpoint', async () => {
    const list = await api().get('/api/v1/admin/works').expect(401)
    const detail = await api().get(`/api/v1/admin/works/${createdIds[0] ?? '11111111-1111-4111-8111-111111111111'}`)
    const create = await api().post('/api/v1/admin/works').send({})
    const patch = await api().patch('/api/v1/admin/works/11111111-1111-4111-8111-111111111111').send({})
    const remove = await api().delete('/api/v1/admin/works/11111111-1111-4111-8111-111111111111')

    for (const response of [list, detail, create, patch, remove]) {
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates a DRAFT work that stays invisible to the Public API', async () => {
    const slug = uniqueSlug('e2e-draft')
    const response = await createWork({
      slug,
      status: 'DRAFT',
      featured: false,
      translations: [
        { locale: 'zh-CN', title: 'E2E 草稿', summary: '草稿摘要' },
        { locale: 'en-US', title: 'E2E draft', summary: 'Draft summary' },
      ],
    })

    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('DRAFT')
    expect(response.body.data.translations).toHaveLength(2)

    await api().get(`/api/v1/work/${slug}`).expect(404)
  })

  it('publishes a work and makes it visible to the Public API', async () => {
    const slug = uniqueSlug('e2e-published')
    const created = await createWork({
      slug,
      status: 'DRAFT',
      translations: [
        { locale: 'zh-CN', title: 'E2E 发布', summary: '摘要' },
        { locale: 'en-US', title: 'E2E published', summary: 'Summary' },
      ],
    })

    const published = await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({
      status: 'PUBLISHED',
    })

    expect(published.status).toBe(200)
    expect(published.body.data.publishedAt).toBeTruthy()

    const publicZh = await api().get(`/api/v1/work/${slug}?locale=zh-CN`).expect(200)
    const publicEn = await api().get(`/api/v1/work/${slug}?locale=en-US`).expect(200)

    expect(publicZh.body.data.title).toBe('E2E 发布')
    expect(publicEn.body.data.title).toBe('E2E published')
  })

  it('hides the work again after PUBLISHED → DRAFT and PUBLISHED → ARCHIVED', async () => {
    const slug = uniqueSlug('e2e-unpublish')
    const created = await createWork({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: 'E2E 状态' }],
    })

    await api().get(`/api/v1/work/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({ status: 'DRAFT' }).expect(200)
    await api().get(`/api/v1/work/${slug}`).expect(404)

    await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({ status: 'PUBLISHED' }).expect(200)
    await api().get(`/api/v1/work/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({ status: 'ARCHIVED' }).expect(200)
    await api().get(`/api/v1/work/${slug}`).expect(404)
  })

  it('falls back to zh-CN when the requested locale translation is missing', async () => {
    const slug = uniqueSlug('e2e-fallback')

    await createWork({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '仅中文' }],
    })

    const response = await api().get(`/api/v1/work/${slug}?locale=en-US`).expect(200)

    expect(response.body.data.locale).toBe('zh-CN')
    expect(response.body.data.localeFallback).toBe(true)
    expect(response.body.data.title).toBe('仅中文')
  })

  it('keeps featured flag and filters accordingly', async () => {
    const slug = uniqueSlug('e2e-featured')

    await createWork({
      slug,
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'zh-CN', title: 'E2E 精选' }],
    })

    const featured = await asAdmin('get', '/api/v1/admin/works?featured=true&pageSize=100').expect(200)

    expect((featured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(true)

    const notFeatured = await asAdmin('get', '/api/v1/admin/works?featured=false&pageSize=100').expect(200)

    expect((notFeatured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(false)
  })

  it('supports status filter, search, pagination and sort whitelist', async () => {
    const draft = await asAdmin('get', '/api/v1/admin/works?status=DRAFT&pageSize=100').expect(200)
    expect((draft.body.data as Array<{ status: string }>).every((item) => item.status === 'DRAFT')).toBe(true)

    const search = await asAdmin('get', '/api/v1/admin/works?search=eson&pageSize=100').expect(200)
    expect(search.body.meta).toMatchObject({ page: 1 })

    const paginated = await asAdmin('get', '/api/v1/admin/works?page=1&pageSize=2').expect(200)
    expect(paginated.body.data.length).toBeLessThanOrEqual(2)
    expect(paginated.body.meta.pageSize).toBe(2)

    // 排序字段受 DTO 白名单保护：非白名单值返回 400 VALIDATION_ERROR（而不是任意字段注入）
    const badSort = await asAdmin('get', '/api/v1/admin/works?sort=title&order=desc').expect(400)
    expect(badSort.body.error.code).toBe('VALIDATION_ERROR')

    const badOrder = await asAdmin('get', '/api/v1/admin/works?sort=publishedAt&order=sideways').expect(400)
    expect(badOrder.body.error.code).toBe('VALIDATION_ERROR')

    // 白名单内的排序字段正常工作
    const goodSort = await asAdmin(
      'get',
      '/api/v1/admin/works?sort=publishedAt&order=desc&pageSize=100',
    ).expect(200)

    expect(goodSort.body.success).toBe(true)
    expect(goodSort.body.meta.pageSize).toBe(100)
  })

  it('updates translations, relations and base fields', async () => {
    const slug = uniqueSlug('e2e-update')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const tags = await asAdmin('get', '/api/v1/admin/tags').expect(200)
    const media = await asAdmin('get', '/api/v1/admin/media').expect(200)

    const categoryId = categories.body.data[0].id as string
    const tagId = tags.body.data[0].id as string
    const mediaId = media.body.data[0]?.id as string | undefined

    const created = await createWork({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '更新前' }],
      categoryIds: [],
      tagIds: [],
    })

    const updated = await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({
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

    // 再次替换为空 → 关系被移除
    const cleared = await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({
      categoryIds: [],
      tagIds: [],
      mediaIds: [],
    })

    expect(cleared.body.data.categoryIds).toEqual([])
    expect(cleared.body.data.tagIds).toEqual([])
    expect(cleared.body.data.mediaIds).toEqual([])
  })

  it('returns CONFLICT for duplicate slugs without touching existing data', async () => {
    const existing = await asAdmin('get', '/api/v1/admin/works?pageSize=1').expect(200)
    const existingSlug = existing.body.data[0].slug as string
    const existingId = existing.body.data[0].id as string

    const createConflict = await createWork({
      slug: existingSlug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突' }],
    })

    expect(createConflict.status).toBe(409)
    expect(createConflict.body.error.code).toBe('CONFLICT')

    const slug = uniqueSlug('e2e-conflict')
    const created = await createWork({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突更新' }],
    })

    const updateConflict = await asAdmin('patch', `/api/v1/admin/works/${created.body.data.id}`).send({
      slug: existingSlug,
    })

    expect(updateConflict.status).toBe(409)
    expect(updateConflict.body.error.code).toBe('CONFLICT')

    // 原数据未被破坏
    const unchanged = await asAdmin('get', `/api/v1/admin/works/${created.body.data.id}`).expect(200)
    expect(unchanged.body.data.slug).toBe(slug)

    const original = await asAdmin('get', `/api/v1/admin/works/${existingId}`).expect(200)
    expect(original.body.data.slug).toBe(existingSlug)
  })

  it('deletes a work, cleans join records and keeps taxonomy/media rows', async () => {
    const slug = uniqueSlug('e2e-delete')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const categoryId = categories.body.data[0].id as string
    const categoriesBefore = categories.body.data.length

    const created = await createWork({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '待删除' }],
      categoryIds: [categoryId],
    })

    await api().get(`/api/v1/work/${slug}`).expect(200)

    const deleted = await asAdmin('delete', `/api/v1/admin/works/${created.body.data.id}`).expect(200)
    expect(deleted.body.data).toEqual({ id: created.body.data.id, deleted: true })

    await asAdmin('get', `/api/v1/admin/works/${created.body.data.id}`).expect(404)
    await api().get(`/api/v1/work/${slug}`).expect(404)

    const categoriesAfter = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    expect(categoriesAfter.body.data.length).toBe(categoriesBefore)

    // 从 cleanup 列表中移除，避免重复删除
    createdIds.splice(createdIds.indexOf(created.body.data.id), 1)
  })
})
