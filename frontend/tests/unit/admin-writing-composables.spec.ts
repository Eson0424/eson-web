import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminWritingEditor } from '~/composables/useAdminWritingEditor'
import { useAdminWritingList } from '~/composables/useAdminWritingList'
import {
  createEmptyWritingForm,
  fromWritingDetail,
  hasWritingFormErrors,
  isWritingFormDirty,
  toWritingPayload,
  validateWritingForm,
  writingTranslationSummary,
} from '~/utils/writing-form'

// Phase 4-D：Admin Writing list / editor composable（共享实现 + Writing adapter）。

const MARKDOWN = '# Heading\n\n**bold**\n\n- item\n\n```js\nconst hello = "world"\n```'

const auth = { accessToken: 'test-token' as string | null }
const service = {
  list: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}

let asyncData: {
  data: ReturnType<typeof ref>
  status: ReturnType<typeof ref>
  error: ReturnType<typeof ref>
  run: () => Promise<void>
}

const listItem = {
  id: 'w1',
  slug: 'notes-on-agent-workflows',
  status: 'PUBLISHED',
  featured: true,
  title: 'Agent Workflow 笔记',
  locale: 'zh-CN',
  translationStatus: { 'zh-CN': true, 'en-US': false },
  missingLocales: ['en-US'],
  categories: [],
  tags: [],
  publishedAt: '2026-06-21T00:00:00.000Z',
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
}

const detail = {
  id: 'w1',
  slug: 'notes-on-agent-workflows',
  status: 'PUBLISHED' as const,
  featured: true,
  sortOrder: 1,
  coverMediaId: null,
  publishedAt: '2026-06-21T00:00:00.000Z',
  translations: [
    {
      locale: 'zh-CN',
      title: 'Agent Workflow 笔记',
      subtitle: null,
      excerpt: '摘要',
      content: MARKDOWN,
      seoTitle: null,
      seoDescription: null,
    },
  ],
  categoryIds: [],
  tagIds: [],
  mediaIds: [],
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
}

function stubGlobals() {
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  // Nuxt 会自动导入 app/utils 下的纯函数；单测里用同一份真实实现补齐。
  vi.stubGlobal('createEmptyWritingForm', createEmptyWritingForm)
  vi.stubGlobal('fromWritingDetail', fromWritingDetail)
  vi.stubGlobal('isWritingFormDirty', isWritingFormDirty)
  vi.stubGlobal('writingTranslationSummary', writingTranslationSummary)
  vi.stubGlobal('validateWritingForm', validateWritingForm)
  vi.stubGlobal('hasWritingFormErrors', hasWritingFormErrors)
  vi.stubGlobal('toWritingPayload', toWritingPayload)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminWritingService', () => service)
  vi.stubGlobal(
    'useAsyncData',
    (_key: string, handler: () => Promise<unknown>) => {
      const data = ref<unknown>(null)
      const status = ref<string>('idle')
      const error = ref<unknown>(null)
      const run = async () => {
        status.value = 'pending'
        try {
          data.value = await handler()
          status.value = 'success'
          error.value = null
        } catch (requestError) {
          error.value = requestError
          status.value = 'error'
        }
      }

      asyncData = { data, status, error, run }

      return { data, status, error, refresh: run }
    },
  )
}

beforeEach(() => {
  auth.accessToken = 'test-token'
  service.list.mockReset()
  service.detail.mockReset()
  service.create.mockReset()
  service.update.mockReset()
  service.remove.mockReset()
  stubGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminWritingList', () => {
  it('queries page 1 with the default filters', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })

    const list = useAdminWritingList()

    await asyncData.run()

    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 1,
      pageSize: 20,
      sort: 'updatedAt',
      order: 'desc',
    })
    expect(list.items.value).toEqual([listItem])
  })

  it('sends trimmed search plus status/featured filters and pagination', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 2, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminWritingList()

    list.query.status = 'DRAFT'
    list.query.featured = 'false'
    list.query.search = '  agent  '
    list.query.page = 2

    await list.refresh()

    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 2,
      pageSize: 20,
      status: 'DRAFT',
      featured: 'false',
      search: 'agent',
      sort: 'updatedAt',
      order: 'desc',
    })
  })

  it('reports 401 without calling the API, plus empty/error/retry states', async () => {
    auth.accessToken = null

    useAdminWritingList()
    await asyncData.run()

    expect(service.list).not.toHaveBeenCalled()
    expect((asyncData.error.value as { statusCode?: number }).statusCode).toBe(401)

    auth.accessToken = 'test-token'
    service.list.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminWritingList()

    await list.refresh()
    expect(list.items.value).toEqual([])

    service.list.mockRejectedValueOnce(new Error('boom'))
    await list.refresh()
    expect(list.status.value).toBe('error')

    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    await list.refresh()
    expect(list.status.value).toBe('success')
  })

  it('resets filters and deletes through the service', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    service.remove.mockResolvedValue({ id: 'w1', deleted: true })

    const list = useAdminWritingList()

    list.query.status = 'ARCHIVED'
    list.query.featured = 'true'
    list.query.search = 'agent'
    list.query.page = 3
    list.resetFilters()

    expect(list.query).toMatchObject({ status: '', featured: '', search: '', page: 1 })

    await asyncData.run()
    await list.removeWriting('w1')

    expect(service.remove).toHaveBeenCalledWith('test-token', 'w1')
    expect(service.list).toHaveBeenCalledTimes(2)
  })
})

describe('useAdminWritingEditor', () => {
  it('starts clean with an empty draft form', () => {
    const editor = useAdminWritingEditor()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.form.status).toBe('DRAFT')
  })

  it('blocks saving an invalid form before reaching the API', async () => {
    const editor = useAdminWritingEditor()

    expect(await editor.save()).toBe(false)
    expect(editor.saveError.value).toBe('invalid-slug')
    expect(service.create).not.toHaveBeenCalled()
  })

  it('creates the article with excerpt + verbatim Markdown content', async () => {
    service.create.mockResolvedValue(detail)

    const editor = useAdminWritingEditor()

    editor.form.slug = 'notes-on-agent-workflows'
    editor.form.translations['zh-CN'].title = 'Agent Workflow 笔记'
    editor.form.translations['zh-CN'].excerpt = '摘要'
    editor.form.translations['zh-CN'].content = MARKDOWN
    editor.form.status = 'PUBLISHED'

    expect(editor.isDirty.value).toBe(true)
    expect(await editor.save()).toBe(true)

    const payload = service.create.mock.calls[0]?.[1] as Record<string, unknown>
    const translations = payload.translations as Array<Record<string, unknown>>

    expect(editor.saveSuccess.value).toBe(true)
    expect(editor.isDirty.value).toBe(false)
    expect(translations[0]).toMatchObject({ locale: 'zh-CN', excerpt: '摘要', content: MARKDOWN })
    expect(translations[0]).not.toHaveProperty('summary')
  })

  it('maps slug conflict (409) and other save failures', async () => {
    service.create.mockRejectedValueOnce(Object.assign(new Error('conflict'), { statusCode: 409 }))

    const conflictEditor = useAdminWritingEditor()

    conflictEditor.form.slug = 'taken'
    conflictEditor.form.translations['zh-CN'].title = '冲突'

    await conflictEditor.save()
    expect(conflictEditor.saveError.value).toBe('slug-conflict')

    service.create.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))

    const failingEditor = useAdminWritingEditor()

    failingEditor.form.slug = 'notes'
    failingEditor.form.translations['zh-CN'].title = '失败'

    await failingEditor.save()
    expect(failingEditor.saveError.value).toBe('save-failed')
  })

  it('loads the detail, keeps Markdown intact and tracks dirty state', async () => {
    service.detail.mockResolvedValue(detail)

    const editor = useAdminWritingEditor('w1')

    expect(editor.isLoading.value).toBe(true)

    await editor.load()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.form.slug).toBe('notes-on-agent-workflows')
    expect(editor.form.translations['zh-CN'].excerpt).toBe('摘要')
    expect(editor.form.translations['zh-CN'].content).toBe(MARKDOWN)
    expect(editor.isDirty.value).toBe(false)

    editor.form.translations['zh-CN'].content = `${MARKDOWN}\n\n## 追加`
    expect(editor.isDirty.value).toBe(true)

    editor.markClean()
    expect(editor.isDirty.value).toBe(false)
  })

  it('updates instead of creating and reports load failures', async () => {
    service.detail.mockResolvedValue(detail)
    service.update.mockResolvedValue(detail)

    const editor = useAdminWritingEditor('w1')

    await editor.load()
    await editor.save()

    expect(service.update).toHaveBeenCalledWith('test-token', 'w1', expect.objectContaining({ slug: 'notes-on-agent-workflows' }))
    expect(service.create).not.toHaveBeenCalled()

    service.detail.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }))

    const notFoundEditor = useAdminWritingEditor('w1')

    await notFoundEditor.load()
    expect(notFoundEditor.loadError.value).toBe('not-found')

    service.detail.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))

    const failingEditor = useAdminWritingEditor('w1')

    await failingEditor.load()
    expect(failingEditor.loadError.value).toBe('load-failed')
  })

  it('deletes only when an id exists and reports failures', async () => {
    expect(await useAdminWritingEditor().remove()).toBe(false)

    service.remove.mockResolvedValue({ id: 'w1', deleted: true })

    expect(await useAdminWritingEditor('w1').remove()).toBe(true)

    service.remove.mockRejectedValueOnce(new Error('boom'))

    expect(await useAdminWritingEditor('w1').remove()).toBe(false)
  })
})
