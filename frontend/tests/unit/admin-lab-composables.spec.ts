import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminLabEditor } from '~/composables/useAdminLabEditor'
import { useAdminLabList } from '~/composables/useAdminLabList'
import {
  createEmptyLabForm,
  fromLabDetail,
  hasLabFormErrors,
  isLabFormDirty,
  labTranslationSummary,
  toLabPayload,
  validateLabForm,
} from '~/utils/lab-form'

// Phase 4-C：Admin Lab list / editor composable（共享实现 + Lab adapter）。

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
  id: 'l1',
  slug: 'agent-workflow-prototype',
  status: 'PUBLISHED',
  featured: true,
  title: 'Agent Workflow 原型',
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
  id: 'l1',
  slug: 'agent-workflow-prototype',
  status: 'PUBLISHED' as const,
  featured: true,
  sortOrder: 1,
  coverMediaId: null,
  githubUrl: null,
  demoUrl: null,
  projectUrl: null,
  publishedAt: '2026-06-21T00:00:00.000Z',
  translations: [
    {
      locale: 'zh-CN',
      title: 'Agent Workflow 原型',
      subtitle: null,
      summary: null,
      content: null,
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
  vi.stubGlobal('createEmptyLabForm', createEmptyLabForm)
  vi.stubGlobal('fromLabDetail', fromLabDetail)
  vi.stubGlobal('isLabFormDirty', isLabFormDirty)
  vi.stubGlobal('labTranslationSummary', labTranslationSummary)
  vi.stubGlobal('validateLabForm', validateLabForm)
  vi.stubGlobal('hasLabFormErrors', hasLabFormErrors)
  vi.stubGlobal('toLabPayload', toLabPayload)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminLabService', () => service)
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

describe('useAdminLabList', () => {
  it('queries page 1 with the default filters', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })

    const list = useAdminLabList()

    await asyncData.run()

    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 1,
      pageSize: 20,
      sort: 'updatedAt',
      order: 'desc',
    })
    expect(list.items.value).toEqual([listItem])
    expect(list.meta.value?.total).toBe(1)
  })

  it('sends trimmed search plus status/featured filters and pagination', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 2, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminLabList()

    list.query.status = 'PUBLISHED'
    list.query.featured = 'true'
    list.query.search = '  agent  '
    list.query.page = 2

    await list.refresh()

    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 2,
      pageSize: 20,
      status: 'PUBLISHED',
      featured: 'true',
      search: 'agent',
      sort: 'updatedAt',
      order: 'desc',
    })
  })

  it('reports 401 instead of calling the API without a token', async () => {
    auth.accessToken = null

    useAdminLabList()
    await asyncData.run()

    expect(service.list).not.toHaveBeenCalled()
    expect((asyncData.error.value as { statusCode?: number }).statusCode).toBe(401)
  })

  it('exposes empty state, error state and retry', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminLabList()

    await asyncData.run()
    expect(list.items.value).toEqual([])
    expect(list.meta.value?.totalPages).toBe(0)

    service.list.mockRejectedValueOnce(new Error('boom'))
    await list.refresh()
    expect(list.status.value).toBe('error')

    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    await list.refresh()
    expect(list.status.value).toBe('success')
  })

  it('resets filters back to the first unfiltered page', () => {
    const list = useAdminLabList()

    list.query.status = 'DRAFT'
    list.query.featured = 'false'
    list.query.search = 'agent'
    list.query.page = 3

    list.resetFilters()

    expect(list.query.status).toBe('')
    expect(list.query.featured).toBe('')
    expect(list.query.search).toBe('')
    expect(list.query.page).toBe(1)
  })

  it('deletes through the service and refreshes the list', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    service.remove.mockResolvedValue({ id: 'l1', deleted: true })

    const list = useAdminLabList()

    await asyncData.run()
    await list.removeLab('l1')

    expect(service.remove).toHaveBeenCalledWith('test-token', 'l1')
    expect(service.list).toHaveBeenCalledTimes(2)
  })
})

describe('useAdminLabEditor (create mode)', () => {
  it('starts clean with an empty draft form and no loading state', () => {
    const editor = useAdminLabEditor()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.form.status).toBe('DRAFT')
    expect(editor.form.slug).toBe('')
  })

  it('blocks saving an invalid form before reaching the API', async () => {
    const editor = useAdminLabEditor()

    expect(await editor.save()).toBe(false)
    expect(editor.saveError.value).toBe('invalid-slug')
    expect(service.create).not.toHaveBeenCalled()
  })

  it('creates the lab with the Lab payload (no Work date fields)', async () => {
    service.create.mockResolvedValue(detail)

    const editor = useAdminLabEditor()

    editor.form.slug = 'agent-workflow-prototype'
    editor.form.translations['zh-CN'].title = 'Agent Workflow 原型'
    editor.form.status = 'PUBLISHED'

    expect(editor.isDirty.value).toBe(true)
    expect(await editor.save()).toBe(true)

    const payload = service.create.mock.calls[0]?.[1] as Record<string, unknown>

    expect(editor.saveSuccess.value).toBe(true)
    expect(editor.isDirty.value).toBe(false)
    expect(payload.slug).toBe('agent-workflow-prototype')
    expect(payload.status).toBe('PUBLISHED')
    expect(Object.keys(payload)).not.toContain('startDate')
  })

  it('maps a slug conflict (409) and other failures', async () => {
    service.create.mockRejectedValueOnce(Object.assign(new Error('conflict'), { statusCode: 409 }))

    const conflictEditor = useAdminLabEditor()

    conflictEditor.form.slug = 'taken'
    conflictEditor.form.translations['zh-CN'].title = '冲突'

    await conflictEditor.save()
    expect(conflictEditor.saveError.value).toBe('slug-conflict')

    service.create.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))

    const failingEditor = useAdminLabEditor()

    failingEditor.form.slug = 'agent-workflow'
    failingEditor.form.translations['zh-CN'].title = '失败'

    await failingEditor.save()
    expect(failingEditor.saveError.value).toBe('save-failed')
  })

  it('marks the translation status while typing', () => {
    const editor = useAdminLabEditor()

    expect(editor.translationStatus.value.missing).toEqual(['zh-CN', 'en-US'])

    editor.form.translations['zh-CN'].title = '中文'

    expect(editor.translationStatus.value.missing).toEqual(['en-US'])
  })
})

describe('useAdminLabEditor (edit mode)', () => {
  it('loads the detail, hydrates the form and resets the baseline', async () => {
    service.detail.mockResolvedValue(detail)

    const editor = useAdminLabEditor('l1')

    expect(editor.isLoading.value).toBe(true)

    await editor.load()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.loadError.value).toBeNull()
    expect(editor.form.slug).toBe('agent-workflow-prototype')
    expect(editor.form.translations['zh-CN'].title).toBe('Agent Workflow 原型')
    expect(editor.isDirty.value).toBe(false)

    editor.form.featured = false
    expect(editor.isDirty.value).toBe(true)

    editor.markClean()
    expect(editor.isDirty.value).toBe(false)
  })

  it('updates instead of creating when an id is present', async () => {
    service.detail.mockResolvedValue(detail)
    service.update.mockResolvedValue(detail)

    const editor = useAdminLabEditor('l1')

    await editor.load()
    await editor.save()

    expect(service.update).toHaveBeenCalledWith(
      'test-token',
      'l1',
      expect.objectContaining({ slug: 'agent-workflow-prototype' }),
    )
    expect(service.create).not.toHaveBeenCalled()
  })

  it('reports not-found and other load failures', async () => {
    service.detail.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }))

    const notFoundEditor = useAdminLabEditor('l1')

    await notFoundEditor.load()
    expect(notFoundEditor.loadError.value).toBe('not-found')

    service.detail.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))

    const failingEditor = useAdminLabEditor('l1')

    await failingEditor.load()
    expect(failingEditor.loadError.value).toBe('load-failed')
  })

  it('deletes only when an id exists and reports failures', async () => {
    expect(await useAdminLabEditor().remove()).toBe(false)

    service.remove.mockResolvedValue({ id: 'l1', deleted: true })

    const editor = useAdminLabEditor('l1')

    expect(await editor.remove()).toBe(true)
    expect(service.remove).toHaveBeenCalledWith('test-token', 'l1')

    service.remove.mockRejectedValueOnce(new Error('boom'))

    expect(await useAdminLabEditor('l1').remove()).toBe(false)
  })
})
