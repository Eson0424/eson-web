import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js'

/**
 * Admin Writing CMS E2E（需要真实 PostgreSQL）。
 * 重点：Markdown 正文在 Admin → DB → Public API 链路上保持原样；
 * status / locale / slug / 关系 / 冲突行为与 Work / Lab 一致。
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip

const MARKDOWN = [
  '# Heading',
  '',
  'A paragraph with **bold** text and `inline code`.',
  '',
  '- item one',
  '- item two',
  '',
  '```js',
  'const hello = "world"',
  '```',
].join('\n')

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

describeWithDatabase('Admin Writing CMS (e2e)', () => {
  let app: INestApplication
  let token = ''
  const createdIds: string[] = []

  const api = () => request(app.getHttpServer())
  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    (api() as unknown as Record<string, (path: string) => request.Test>)[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    )

  async function createWriting(payload: Record<string, unknown>) {
    const response = await asAdmin('post', '/api/v1/admin/writings').send(payload)

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
      await asAdmin('delete', `/api/v1/admin/writings/${id}`)
    }

    await app?.close()
  })

  it('rejects anonymous access to every admin writing endpoint', async () => {
    const list = await api().get('/api/v1/admin/writings')
    const detail = await api().get('/api/v1/admin/writings/11111111-1111-4111-8111-111111111111')
    const create = await api().post('/api/v1/admin/writings').send({})
    const patch = await api().patch('/api/v1/admin/writings/11111111-1111-4111-8111-111111111111').send({})
    const remove = await api().delete('/api/v1/admin/writings/11111111-1111-4111-8111-111111111111')

    for (const response of [list, detail, create, patch, remove]) {
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates a DRAFT article and keeps the Markdown body byte-identical', async () => {
    const slug = uniqueSlug('e2e-writing-draft')
    const response = await createWriting({
      slug,
      status: 'DRAFT',
      featured: false,
      translations: [
        { locale: 'zh-CN', title: 'E2E 文章草稿', excerpt: '草稿摘要', content: MARKDOWN },
        { locale: 'en-US', title: 'E2E writing draft', excerpt: 'Draft excerpt' },
      ],
    })

    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('DRAFT')
    expect(response.body.data.translations).toHaveLength(2)

    const zh = (response.body.data.translations as Array<Record<string, unknown>>).find(
      (translation) => translation.locale === 'zh-CN',
    )

    expect(zh?.content).toBe(MARKDOWN)
    expect(zh?.excerpt).toBe('草稿摘要')
    expect(zh).not.toHaveProperty('summary')
    // Writing 没有 Work / Lab 的链接与日期字段
    expect(response.body.data.githubUrl).toBeUndefined()
    expect(response.body.data.startDate).toBeUndefined()

    await api().get(`/api/v1/writing/${slug}`).expect(404)
  })

  it('publishes the article and returns the Markdown body to the Public API unchanged', async () => {
    const slug = uniqueSlug('e2e-writing-published')
    const created = await createWriting({
      slug,
      status: 'DRAFT',
      translations: [
        { locale: 'zh-CN', title: 'E2E 发布文章', excerpt: '摘要', content: MARKDOWN },
      ],
    })

    const published = await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({
      status: 'PUBLISHED',
    })

    expect(published.status).toBe(200)
    expect(published.body.data.publishedAt).toBeTruthy()

    const publicDetail = await api().get(`/api/v1/writing/${slug}?locale=zh-CN`).expect(200)

    expect(publicDetail.body.data.title).toBe('E2E 发布文章')
    expect(publicDetail.body.data.excerpt).toBe('摘要')
    // Public API 必须拿到同一份 Markdown 原文
    expect(publicDetail.body.data.content).toBe(MARKDOWN)
    expect(publicDetail.body.data.content).toContain('# Heading')
    expect(publicDetail.body.data.content).toContain('**bold**')
    expect(publicDetail.body.data.content).toContain('- item one')
    expect(publicDetail.body.data.content).toContain('const hello = "world"')
  })

  it('updates the Markdown body and returns it unchanged', async () => {
    const slug = uniqueSlug('e2e-writing-update')
    const created = await createWriting({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '更新前', content: '# Old' }],
    })

    const nextMarkdown = '## 新章节\n\n- 列表项\n\n```ts\nconst value: number = 1\n```'
    const updated = await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({
      translations: [{ locale: 'zh-CN', title: '更新后', excerpt: '新摘要', content: nextMarkdown }],
    })

    expect(updated.status).toBe(200)
    expect(updated.body.data.translations[0].content).toBe(nextMarkdown)
    expect(updated.body.data.translations[0].excerpt).toBe('新摘要')

    const publicDetail = await api().get(`/api/v1/writing/${slug}`).expect(200)

    expect(publicDetail.body.data.content).toBe(nextMarkdown)
  })

  it('hides the article again after PUBLISHED → DRAFT and PUBLISHED → ARCHIVED', async () => {
    const slug = uniqueSlug('e2e-writing-unpublish')
    const created = await createWriting({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '状态文章' }],
    })

    await api().get(`/api/v1/writing/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({ status: 'DRAFT' }).expect(200)
    await api().get(`/api/v1/writing/${slug}`).expect(404)

    await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({ status: 'PUBLISHED' }).expect(200)
    await api().get(`/api/v1/writing/${slug}`).expect(200)

    await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`)
      .send({ status: 'ARCHIVED' })
      .expect(200)
    await api().get(`/api/v1/writing/${slug}`).expect(404)
  })

  it('falls back to zh-CN when the requested locale translation is missing', async () => {
    const slug = uniqueSlug('e2e-writing-fallback')

    await createWriting({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '仅中文文章' }],
    })

    const response = await api().get(`/api/v1/writing/${slug}?locale=en-US`).expect(200)

    expect(response.body.data.locale).toBe('zh-CN')
    expect(response.body.data.localeFallback).toBe(true)
    expect(response.body.data.title).toBe('仅中文文章')
  })

  it('supports status / featured / search / category / tag filters, pagination and sort whitelist', async () => {
    const slug = uniqueSlug('e2e-writing-featured')

    await createWriting({
      slug,
      status: 'PUBLISHED',
      featured: true,
      translations: [{ locale: 'zh-CN', title: 'E2E 精选文章' }],
    })

    const featured = await asAdmin('get', '/api/v1/admin/writings?featured=true&pageSize=100').expect(200)

    expect((featured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(true)

    const notFeatured = await asAdmin('get', '/api/v1/admin/writings?featured=false&pageSize=100').expect(200)

    expect((notFeatured.body.data as Array<{ slug: string }>).some((item) => item.slug === slug)).toBe(false)

    const draft = await asAdmin('get', '/api/v1/admin/writings?status=DRAFT&pageSize=100').expect(200)

    expect((draft.body.data as Array<{ status: string }>).every((item) => item.status === 'DRAFT')).toBe(true)

    const search = await asAdmin('get', '/api/v1/admin/writings?search=e2e-writing&pageSize=100').expect(200)

    expect(search.body.meta.total).toBeGreaterThanOrEqual(1)

    const paginated = await asAdmin('get', '/api/v1/admin/writings?page=1&pageSize=2').expect(200)

    expect(paginated.body.data.length).toBeLessThanOrEqual(2)
    expect(paginated.body.meta.pageSize).toBe(2)

    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const categorySlug = categories.body.data[0].slug as string

    await asAdmin('get', `/api/v1/admin/writings?category=${categorySlug}&pageSize=100`).expect(200)

    const tags = await asAdmin('get', '/api/v1/admin/tags').expect(200)
    const tagSlug = tags.body.data[0].slug as string

    await asAdmin('get', `/api/v1/admin/writings?tag=${tagSlug}&pageSize=100`).expect(200)

    const badSort = await asAdmin('get', '/api/v1/admin/writings?sort=title&order=desc').expect(400)

    expect(badSort.body.error.code).toBe('VALIDATION_ERROR')

    const goodSort = await asAdmin(
      'get',
      '/api/v1/admin/writings?sort=publishedAt&order=desc&pageSize=100',
    ).expect(200)

    expect(goodSort.body.success).toBe(true)
  })

  it('updates translations, relations and base fields', async () => {
    const slug = uniqueSlug('e2e-writing-relations')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const tags = await asAdmin('get', '/api/v1/admin/tags').expect(200)
    const media = await asAdmin('get', '/api/v1/admin/media').expect(200)

    const categoryId = categories.body.data[0].id as string
    const tagId = tags.body.data[0].id as string
    const mediaId = media.body.data[0]?.id as string | undefined

    const created = await createWriting({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '关系文章' }],
      categoryIds: [],
      tagIds: [],
    })

    const updated = await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({
      featured: true,
      translations: [
        { locale: 'zh-CN', title: '关系文章', content: MARKDOWN },
        { locale: 'en-US', title: 'Relations article' },
      ],
      categoryIds: [categoryId],
      tagIds: [tagId],
      ...(mediaId ? { mediaIds: [mediaId], coverMediaId: mediaId } : {}),
    })

    expect(updated.status).toBe(200)
    expect(updated.body.data.categoryIds).toEqual([categoryId])
    expect(updated.body.data.tagIds).toEqual([tagId])
    if (mediaId) {
      expect(updated.body.data.mediaIds).toEqual([mediaId])
      expect(updated.body.data.coverMediaId).toBe(mediaId)
    }

    const cleared = await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({
      categoryIds: [],
      tagIds: [],
      mediaIds: [],
      coverMediaId: null,
    })

    expect(cleared.body.data.categoryIds).toEqual([])
    expect(cleared.body.data.tagIds).toEqual([])
    expect(cleared.body.data.mediaIds).toEqual([])
    expect(cleared.body.data.coverMediaId).toBeNull()
  })

  it('returns CONFLICT for duplicate slugs without touching existing data', async () => {
    const existing = await asAdmin('get', '/api/v1/admin/writings?pageSize=1').expect(200)
    const existingSlug = existing.body.data[0].slug as string
    const existingId = existing.body.data[0].id as string

    const createConflict = await createWriting({
      slug: existingSlug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突' }],
    })

    expect(createConflict.status).toBe(409)
    expect(createConflict.body.error.code).toBe('CONFLICT')

    const slug = uniqueSlug('e2e-writing-conflict')
    const created = await createWriting({
      slug,
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '冲突更新' }],
    })

    const updateConflict = await asAdmin('patch', `/api/v1/admin/writings/${created.body.data.id}`).send({
      slug: existingSlug,
    })

    expect(updateConflict.status).toBe(409)
    expect(updateConflict.body.error.code).toBe('CONFLICT')

    const unchanged = await asAdmin('get', `/api/v1/admin/writings/${created.body.data.id}`).expect(200)

    expect(unchanged.body.data.slug).toBe(slug)

    const original = await asAdmin('get', `/api/v1/admin/writings/${existingId}`).expect(200)

    expect(original.body.data.slug).toBe(existingSlug)
  })

  it('deletes an article, cleans join records and keeps taxonomy/media rows', async () => {
    const slug = uniqueSlug('e2e-writing-delete')
    const categories = await asAdmin('get', '/api/v1/admin/categories').expect(200)
    const categoryId = categories.body.data[0].id as string
    const categoriesBefore = categories.body.data.length

    const created = await createWriting({
      slug,
      status: 'PUBLISHED',
      translations: [{ locale: 'zh-CN', title: '待删除文章', content: MARKDOWN }],
      categoryIds: [categoryId],
    })

    await api().get(`/api/v1/writing/${slug}`).expect(200)

    const deleted = await asAdmin('delete', `/api/v1/admin/writings/${created.body.data.id}`).expect(200)

    expect(deleted.body.data).toEqual({ id: created.body.data.id, deleted: true })

    await asAdmin('get', `/api/v1/admin/writings/${created.body.data.id}`).expect(404)
    await api().get(`/api/v1/writing/${slug}`).expect(404)

    const categoriesAfter = await asAdmin('get', '/api/v1/admin/categories').expect(200)

    expect(categoriesAfter.body.data.length).toBe(categoriesBefore)

    createdIds.splice(createdIds.indexOf(created.body.data.id), 1)
  })

  it('validates slug, status, locale, relations and rejects work/lab-only fields', async () => {
    const invalidSlug = await createWriting({
      slug: 'Not Valid Slug',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '非法 slug' }],
    })

    expect(invalidSlug.status).toBe(400)
    expect(invalidSlug.body.error.code).toBe('VALIDATION_ERROR')

    const invalidStatus = await createWriting({
      slug: uniqueSlug('e2e-writing-status'),
      status: 'LIVE',
      translations: [{ locale: 'zh-CN', title: '非法状态' }],
    })

    expect(invalidStatus.status).toBe(400)

    const invalidLocale = await createWriting({
      slug: uniqueSlug('e2e-writing-locale'),
      status: 'DRAFT',
      translations: [{ locale: 'fr-FR', title: 'invalide' }],
    })

    expect(invalidLocale.status).toBe(400)

    // summary / githubUrl 属于 Work / Lab，不应该被静默忽略
    const workOnlyField = await createWriting({
      slug: uniqueSlug('e2e-writing-unknown'),
      status: 'DRAFT',
      githubUrl: 'https://github.com/example',
      translations: [{ locale: 'zh-CN', title: '未知字段' }],
    })

    expect(workOnlyField.status).toBe(400)
    expect(workOnlyField.body.error.code).toBe('VALIDATION_ERROR')

    const summaryField = await createWriting({
      slug: uniqueSlug('e2e-writing-summary'),
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '未知字段', summary: 'work only' }],
    })

    expect(summaryField.status).toBe(400)

    const badRelation = await createWriting({
      slug: uniqueSlug('e2e-writing-relation'),
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '非法关系' }],
      categoryIds: ['not-a-uuid'],
    })

    expect(badRelation.status).toBe(400)

    const missing = await asAdmin('get', '/api/v1/admin/writings/11111111-1111-4111-8111-111111111111')

    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')

    const badId = await asAdmin('get', '/api/v1/admin/writings/not-a-uuid')

    expect(badId.status).toBe(400)
    expect(badId.body.error.code).toBe('VALIDATION_ERROR')
  })
})
