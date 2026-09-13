import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminExperienceEditor } from '~/composables/useAdminExperienceEditor'
import { useAdminExperienceList } from '~/composables/useAdminExperienceList'
import {
  createEmptyExperienceForm,
  experienceFormErrorKey,
  experienceTranslationSummary,
  fromExperienceDetail,
  hasExperienceFormErrors,
  isExperienceFormDirty,
  toExperiencePayload,
  validateExperienceForm,
} from '~/utils/experience-form'

// Phase 4-E：Admin Experience list / editor composable。

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
  id: 'e1',
  role: '软件工程师',
  company: '示例公司',
  employmentType: 'FULL_TIME',
  location: 'Shanghai',
  startDate: '2024-01-01',
  endDate: null,
  isCurrent: true,
  sortOrder: 1,
  locale: 'zh-CN',
  localeFallback: false,
  translationStatus: { 'zh-CN': true, 'en-US': false },
  missingLocales: ['en-US'],
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
}

const detail = {
  id: 'e1',
  sortOrder: 1,
  employmentType: 'FULL_TIME',
  location: 'Shanghai',
  startDate: '2024-01-01',
  endDate: null,
  isCurrent: true,
  translationStatus: { 'zh-CN': true, 'en-US': false },
  missingLocales: ['en-US'],
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
  translations: [
    {
      locale: 'zh-CN',
      roleName: '软件工程师',
      companyName: '示例公司',
      summary: '摘要',
      content: null,
    },
  ],
}

function stubGlobals() {
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  // Nuxt 会自动导入 app/utils 下的纯函数；单测里用同一份真实实现补齐。
  vi.stubGlobal('createEmptyExperienceForm', createEmptyExperienceForm)
  vi.stubGlobal('fromExperienceDetail', fromExperienceDetail)
  vi.stubGlobal('isExperienceFormDirty', isExperienceFormDirty)
  vi.stubGlobal('experienceTranslationSummary', experienceTranslationSummary)
  vi.stubGlobal('validateExperienceForm', validateExperienceForm)
  vi.stubGlobal('hasExperienceFormErrors', hasExperienceFormErrors)
  vi.stubGlobal('experienceFormErrorKey', experienceFormErrorKey)
  vi.stubGlobal('toExperiencePayload', toExperiencePayload)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAdminExperienceService', () => service)
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

describe('useAdminExperienceList', () => {
  it('queries with the public-compatible default order and no status/featured params', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })

    const list = useAdminExperienceList()

    await asyncData.run()

    const [token, query] = service.list.mock.calls[0] as [string, Record<string, unknown>]

    expect(token).toBe('test-token')
    expect(query).toEqual({ page: 1, pageSize: 20, sort: 'sortOrder', order: 'asc' })
    expect(query).not.toHaveProperty('status')
    expect(query).not.toHaveProperty('featured')
    expect(list.items.value).toEqual([listItem])
  })

  it('passes search and pagination through', async () => {
    service.list.mockResolvedValue({ items: [], meta: { page: 2, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminExperienceList()

    list.query.search = '  engineer  '
    list.query.page = 2

    await list.refresh()

    expect(service.list).toHaveBeenLastCalledWith('test-token', {
      page: 2,
      pageSize: 20,
      sort: 'sortOrder',
      order: 'asc',
      search: 'engineer',
    })
  })

  it('reports 401 without calling the API, plus empty/error/retry states', async () => {
    auth.accessToken = null

    useAdminExperienceList()
    await asyncData.run()

    expect(service.list).not.toHaveBeenCalled()
    expect((asyncData.error.value as { statusCode?: number }).statusCode).toBe(401)

    auth.accessToken = 'test-token'
    service.list.mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const list = useAdminExperienceList()

    await list.refresh()
    expect(list.items.value).toEqual([])

    service.list.mockRejectedValueOnce(new Error('boom'))
    await list.refresh()
    expect(list.status.value).toBe('error')

    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    await list.refresh()
    expect(list.status.value).toBe('success')
  })

  it('deletes through the service and refreshes the list', async () => {
    service.list.mockResolvedValue({ items: [listItem], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
    service.remove.mockResolvedValue({ id: 'e1', deleted: true })

    const list = useAdminExperienceList()

    await asyncData.run()
    await list.removeExperience('e1')

    expect(service.remove).toHaveBeenCalledWith('test-token', 'e1')
    expect(service.list).toHaveBeenCalledTimes(2)
  })
})

describe('useAdminExperienceEditor', () => {
  it('starts clean with an empty draft form', () => {
    const editor = useAdminExperienceEditor()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.form.sortOrder).toBe(0)
    expect(editor.form.isCurrent).toBe(false)
  })

  it('blocks saving when the zh-CN role name is missing', async () => {
    const editor = useAdminExperienceEditor()

    expect(await editor.save()).toBe(false)
    expect(editor.saveError.value).toBe('role-required')
    expect(service.create).not.toHaveBeenCalled()
  })

  it('blocks saving when isCurrent is combined with an end date', async () => {
    const editor = useAdminExperienceEditor()

    editor.form.translations['zh-CN'].roleName = '软件工程师'
    editor.form.isCurrent = true
    editor.form.endDate = '2025-01-01'

    expect(await editor.save()).toBe(false)
    expect(editor.saveError.value).toBe('current-with-end-date')
    expect(service.create).not.toHaveBeenCalled()
  })

  it('creates the experience with the Experience payload shape', async () => {
    service.create.mockResolvedValue(detail)

    const editor = useAdminExperienceEditor()

    editor.form.sortOrder = 2
    editor.form.employmentType = 'FULL_TIME'
    editor.form.translations['zh-CN'].roleName = '软件工程师'
    editor.form.translations['zh-CN'].companyName = '示例公司'

    expect(editor.isDirty.value).toBe(true)
    expect(await editor.save()).toBe(true)

    const payload = service.create.mock.calls[0]?.[1] as Record<string, unknown>

    expect(editor.saveSuccess.value).toBe(true)
    expect(editor.isDirty.value).toBe(false)
    expect(Object.keys(payload)).not.toContain('slug')
    expect(Object.keys(payload)).not.toContain('status')
    expect(Object.keys(payload)).not.toContain('featured')
    expect(payload.translations).toEqual([
      { locale: 'zh-CN', roleName: '软件工程师', companyName: '示例公司' },
    ])
  })

  it('maps save failures to a generic error', async () => {
    service.create.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))

    const editor = useAdminExperienceEditor()

    editor.form.translations['zh-CN'].roleName = '软件工程师'

    await editor.save()

    expect(editor.saveError.value).toBe('save-failed')
  })

  it('loads the detail, hydrates translations and tracks dirty state', async () => {
    service.detail.mockResolvedValue(detail)

    const editor = useAdminExperienceEditor('e1')

    expect(editor.isLoading.value).toBe(true)

    await editor.load()

    expect(editor.isLoading.value).toBe(false)
    expect(editor.form.translations['zh-CN'].roleName).toBe('软件工程师')
    expect(editor.form.isCurrent).toBe(true)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.translationStatus.value.missing).toEqual(['en-US'])

    editor.form.translations['zh-CN'].summary = '改过的摘要'
    expect(editor.isDirty.value).toBe(true)

    editor.markClean()
    expect(editor.isDirty.value).toBe(false)
  })

  it('updates instead of creating and reports load failures', async () => {
    service.detail.mockResolvedValue(detail)
    service.update.mockResolvedValue(detail)

    const editor = useAdminExperienceEditor('e1')

    await editor.load()
    await editor.save()

    expect(service.update).toHaveBeenCalledWith('test-token', 'e1', expect.objectContaining({ sortOrder: 1 }))
    expect(service.create).not.toHaveBeenCalled()

    service.detail.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }))

    const notFoundEditor = useAdminExperienceEditor('e1')

    await notFoundEditor.load()
    expect(notFoundEditor.loadError.value).toBe('not-found')

    service.detail.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))

    const failingEditor = useAdminExperienceEditor('e1')

    await failingEditor.load()
    expect(failingEditor.loadError.value).toBe('load-failed')
  })

  it('deletes only when an id exists and reports failures', async () => {
    expect(await useAdminExperienceEditor().remove()).toBe(false)

    service.remove.mockResolvedValue({ id: 'e1', deleted: true })

    expect(await useAdminExperienceEditor('e1').remove()).toBe(true)

    service.remove.mockRejectedValueOnce(new Error('boom'))

    expect(await useAdminExperienceEditor('e1').remove()).toBe(false)
  })
})
