import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminWorkEditor } from '~/composables/useAdminWorkEditor'
import { useAdminWorkList } from '~/composables/useAdminWorkList'
import {
  createEmptyWorkForm,
  fromWorkDetail,
  hasWorkFormErrors,
  isWorkFormDirty,
  toWorkPayload,
  translationSummary,
  validateWorkForm,
} from '~/utils/work-form'

// Phase 4-B：Admin Work list / editor composable 的行为契约。

const auth = { accessToken: 'test-token' as string | null }
const service = {
  list: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}

let asyncData: { data: ReturnType<typeof ref>; status: ReturnType<typeof ref>; error: ReturnType<typeof ref>; run: () => Promise<void> }

const listItem = {
  id: 'w1',
  slug: 'eson-web',
  status: 'PUBLISHED',
  featured: true,
  title: 'Eson_web',
  locale: 'zh-CN',
  translationStatus: { 'zh-CN': true, 'en-US': true },
  missingLocales: [],
  categories: [],
  tags: [],
  publishedAt: '2026-06-21T00:00:00.000Z',
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
}

function stubGlobals() {
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  // Nuxt 会自动导入 app/utils 下的纯函数；单测里用同一份真实实现补齐。
  vi.stubGlobal('createEmptyWorkForm', createEmptyWorkForm)
  vi.stubGlobal('fromWorkDetail', fromWorkDetail)
  vi.stubGlobal('isWorkFormDirty', isWorkFormDirty)
  vi.stubGlobal('translationSummary', translationSummary)
  vi.stubGlobal('validateWorkForm', validateWorkForm)
  vi.stubGlobal('hasWorkFormErrors', hasWorkFormErrors)
  vi.stubGlobal('toWorkPayload', toWorkPayload)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminWorkService', () => service)
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

describe('useAdminWorkList', () => {
  it('queries page 1 with the default filters', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })

    const list = useAdminWorkList()

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

  it('drops empty filters and trims search before querying', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminWorkList()

    list.query.status = 'DRAFT'
    list.query.featured = 'true'
    list.query.search = '  eson  '
    list.query.page = 3

    await list.refresh()

    expect(service.list).toHaveBeenCalledWith('test-token', {
      page: 3,
      pageSize: 20,
      status: 'DRAFT',
      featured: 'true',
      search: 'eson',
      sort: 'updatedAt',
      order: 'desc',
    })
  })

  it('reports 401 instead of calling the API without a token', async () => {
    auth.accessToken = null

    useAdminWorkList()
    await asyncData.run()

    expect(service.list).not.toHaveBeenCalled()
    expect(asyncData.status.value).toBe('error')
    expect((asyncData.error.value as { statusCode?: number }).statusCode).toBe(401)
  })

  it('exposes empty state when the API returns no items', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminWorkList()

    await asyncData.run()

    expect(list.items.value).toEqual([])
    expect(list.meta.value?.totalPages).toBe(0)
  })

  it('surfaces API failures as an error state that can be retried', async () => {
    service.list.mockRejectedValueOnce(new Error('boom'))

    const list = useAdminWorkList()

    await asyncData.run()

    expect(list.status.value).toBe('error')

    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })

    await list.refresh()

    expect(list.status.value).toBe('success')
    expect(list.items.value).toHaveLength(1)
  })

  it('resets filters back to the first unfiltered page', async () => {
    const list = useAdminWorkList()

    list.query.status = 'PUBLISHED'
    list.query.featured = 'false'
    list.query.search = 'eson'
    list.query.page = 4

    list.resetFilters()

    expect(list.query.status).toBe('')
    expect(list.query.featured).toBe('')
    expect(list.query.search).toBe('')
    expect(list.query.page).toBe(1)
  })

  it('deletes through the service and refreshes the list', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    service.remove.mockResolvedValue({ id: 'w1', deleted: true })

    const list = useAdminWorkList()

    await asyncData.run()
    await list.removeWork('w1')

    expect(service.remove).toHaveBeenCalledWith('test-token', 'w1')
    expect(service.list).toHaveBeenCalledTimes(2)
  })
})

describe('useAdminWorkEditor (create mode)', () => {
  it('starts clean with an empty draft form and no loading state', () => {
    const editor = useAdminWorkEditor()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.form.status).toBe('DRAFT')
    expect(editor.form.slug).toBe('')
  })

  it('blocks saving an invalid form before reaching the API', async () => {
    const editor = useAdminWorkEditor()

    const saved = await editor.save()

    expect(saved).toBe(false)
    expect(editor.saveError.value).toBe('invalid-slug')
    expect(service.create).not.toHaveBeenCalled()
  })

  it('creates the work, keeps baseline in sync and reports success', async () => {
    service.create.mockResolvedValue({ id: 'w1' })

    const editor = useAdminWorkEditor()

    editor.form.slug = 'eson-web'
    editor.form.translations['zh-CN'].title = 'Eson_web'
    editor.form.status = 'PUBLISHED'

    expect(editor.isDirty.value).toBe(true)

    const saved = await editor.save()

    expect(saved).toBe(true)
    expect(editor.saveSuccess.value).toBe(true)
    expect(editor.isDirty.value).toBe(false)
    expect(service.create).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        slug: 'eson-web',
        status: 'PUBLISHED',
        translations: [expect.objectContaining({ locale: 'zh-CN', title: 'Eson_web' })],
      }),
    )
    expect(service.update).not.toHaveBeenCalled()
  })

  it('maps a slug conflict (409) to a dedicated error', async () => {
    service.create.mockRejectedValue(Object.assign(new Error('conflict'), { statusCode: 409 }))

    const editor = useAdminWorkEditor()

    editor.form.slug = 'eson-web'
    editor.form.translations['zh-CN'].title = 'Eson_web'

    await editor.save()

    expect(editor.saveError.value).toBe('slug-conflict')
  })

  it('falls back to a generic save error for other failures', async () => {
    service.create.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }))

    const editor = useAdminWorkEditor()

    editor.form.slug = 'eson-web'
    editor.form.translations['zh-CN'].title = 'Eson_web'

    await editor.save()

    expect(editor.saveError.value).toBe('save-failed')
  })

  it('marks the translation status while typing', () => {
    const editor = useAdminWorkEditor()

    expect(editor.translationStatus.value.missing).toEqual(['zh-CN', 'en-US'])

    editor.form.translations['zh-CN'].title = '中文'

    expect(editor.translationStatus.value.missing).toEqual(['en-US'])
  })
})

describe('useAdminWorkEditor (edit mode)', () => {
  const detail = {
    id: 'w1',
    slug: 'eson-web',
    status: 'PUBLISHED' as const,
    featured: true,
    sortOrder: 1,
    coverMediaId: null,
    githubUrl: null,
    demoUrl: null,
    projectUrl: null,
    startDate: null,
    endDate: null,
    publishedAt: '2026-06-21T00:00:00.000Z',
    translations: [
      {
        locale: 'zh-CN',
        title: 'Eson_web',
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

  it('loads the detail, resets the baseline and clears loading', async () => {
    service.detail.mockResolvedValue(detail)

    const editor = useAdminWorkEditor('w1')

    expect(editor.isLoading.value).toBe(true)

    await editor.load()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.loadError.value).toBeNull()
    expect(editor.form.slug).toBe('eson-web')
    expect(editor.form.translations['zh-CN'].title).toBe('Eson_web')
    expect(editor.isDirty.value).toBe(false)
  })

  it('tracks dirty state and can reset the baseline again', async () => {
    service.detail.mockResolvedValue(detail)

    const editor = useAdminWorkEditor('w1')

    await editor.load()
    editor.form.featured = false

    expect(editor.isDirty.value).toBe(true)

    editor.markClean()

    expect(editor.isDirty.value).toBe(false)
  })

  it('updates instead of creating when an id is present', async () => {
    service.detail.mockResolvedValue(detail)
    service.update.mockResolvedValue(detail)

    const editor = useAdminWorkEditor('w1')

    await editor.load()
    await editor.save()

    expect(service.update).toHaveBeenCalledWith('test-token', 'w1', expect.objectContaining({ slug: 'eson-web' }))
    expect(service.create).not.toHaveBeenCalled()
  })

  it('reports a missing work as not-found instead of a generic failure', async () => {
    service.detail.mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }))

    const editor = useAdminWorkEditor('w1')

    await editor.load()

    expect(editor.loadError.value).toBe('not-found')
    expect(editor.isLoading.value).toBe(false)
  })

  it('reports other load failures as load-failed', async () => {
    service.detail.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))

    const editor = useAdminWorkEditor('w1')

    await editor.load()

    expect(editor.loadError.value).toBe('load-failed')
  })

  it('deletes only when an id exists', async () => {
    const createEditor = useAdminWorkEditor()

    expect(await createEditor.remove()).toBe(false)

    service.remove.mockResolvedValue({ id: 'w1', deleted: true })

    const editor = useAdminWorkEditor('w1')

    expect(await editor.remove()).toBe(true)
    expect(service.remove).toHaveBeenCalledWith('test-token', 'w1')
  })

  it('returns false when the API rejects the delete', async () => {
    service.remove.mockRejectedValue(new Error('boom'))

    const editor = useAdminWorkEditor('w1')

    expect(await editor.remove()).toBe(false)
  })
})
