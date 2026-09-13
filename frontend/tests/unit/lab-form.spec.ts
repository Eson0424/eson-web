import { describe, expect, it } from 'vitest'
import {
  createEmptyLabForm,
  fromLabDetail,
  hasLabFormErrors,
  isLabFormDirty,
  labTranslationSummary,
  toLabPayload,
  validateLabForm,
  type LabFormState,
} from '~/utils/lab-form'

// Phase 4-C：Admin Lab 表单的纯逻辑契约（共享实现见 content-form.ts）。

function makeForm(overrides: Partial<LabFormState> = {}): LabFormState {
  return Object.assign(createEmptyLabForm(), overrides)
}

function withZhTitle(form: LabFormState, title = '中文实验标题'): LabFormState {
  form.translations['zh-CN'].title = title

  return form
}

describe('createEmptyLabForm', () => {
  it('starts as an unsaved zh-CN draft with no relations', () => {
    const form = createEmptyLabForm()

    expect(form.slug).toBe('')
    expect(form.status).toBe('DRAFT')
    expect(form.featured).toBe(false)
    expect(form.sortOrder).toBe(0)
    expect(form.coverMediaId).toBeNull()
    expect(form.categoryIds).toEqual([])
    expect(form.tagIds).toEqual([])
    expect(form.mediaIds).toEqual([])
  })

  it('does not carry Work-only date fields', () => {
    const form = createEmptyLabForm()

    expect(form.startDate).toBeUndefined()
    expect(form.endDate).toBeUndefined()
  })
})

describe('validateLabForm', () => {
  it('rejects an empty form and accepts a slug-safe form with a zh-CN title', () => {
    const empty = validateLabForm(createEmptyLabForm())

    expect(empty.slug).toBe('invalid-slug')
    expect(empty.translations?.['zh-CN']).toBe('title-required')
    expect(hasLabFormErrors(empty)).toBe(true)

    const valid = validateLabForm(withZhTitle(makeForm({ slug: 'agent-workflow-prototype' })))

    expect(valid).toEqual({})
  })

  it.each(['Agent Workflow', 'agent_workflow', 'agent--workflow', '-agent', 'agent workflow'])(
    'rejects the unsafe slug %s',
    (slug) => {
      expect(validateLabForm(withZhTitle(makeForm({ slug }))).slug).toBe('invalid-slug')
    },
  )

  it('allows a missing en-US translation but not a missing zh-CN title', () => {
    expect(validateLabForm(makeForm({ slug: 'agent-workflow' })).translations?.['zh-CN']).toBe(
      'title-required',
    )
    expect(validateLabForm(withZhTitle(makeForm({ slug: 'agent-workflow' }))).translations).toBeUndefined()
  })

  it('requires http(s) URLs when a link is provided', () => {
    expect(validateLabForm(withZhTitle(makeForm({ slug: 'agent-workflow', demoUrl: 'example.com' }))).urls)
      .toBe('invalid-url')
    expect(validateLabForm(withZhTitle(makeForm({ slug: 'agent-workflow', demoUrl: 'https://example.com' }))).urls)
      .toBeUndefined()
  })
})

describe('labTranslationSummary', () => {
  it('reports which locales still need a title', () => {
    expect(labTranslationSummary(createEmptyLabForm()).missing).toEqual(['zh-CN', 'en-US'])
    expect(labTranslationSummary(withZhTitle(makeForm())).missing).toEqual(['en-US'])
  })
})

describe('toLabPayload', () => {
  it('only sends translations that have a title and never sends Work-only dates', () => {
    const form = withZhTitle(makeForm({ slug: '  agent-workflow  ' }))

    form.translations['zh-CN'].summary = '  摘要  '

    const payload = toLabPayload(form)

    expect(payload.slug).toBe('agent-workflow')
    expect(payload.translations).toEqual([{ locale: 'zh-CN', title: '中文实验标题', summary: '摘要' }])
    expect(Object.keys(payload)).not.toContain('startDate')
    expect(Object.keys(payload)).not.toContain('endDate')
  })

  it('normalises empty optional fields and keeps relations', () => {
    const form = withZhTitle(makeForm({ slug: 'agent-workflow', status: 'PUBLISHED', featured: true }))

    form.categoryIds = ['cat-1']
    form.tagIds = ['tag-1']
    form.mediaIds = ['media-1']

    const payload = toLabPayload(form)

    expect(payload.status).toBe('PUBLISHED')
    expect(payload.featured).toBe(true)
    expect(payload.githubUrl).toBeNull()
    expect(payload.publishedAt).toBeNull()
    expect(payload.categoryIds).toEqual(['cat-1'])
    expect(payload.tagIds).toEqual(['tag-1'])
    expect(payload.mediaIds).toEqual(['media-1'])
  })
})

describe('fromLabDetail', () => {
  const detail = {
    slug: 'agent-workflow-prototype',
    status: 'PUBLISHED' as const,
    featured: true,
    sortOrder: 2,
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
        summary: '摘要',
        content: '正文',
        seoTitle: null,
        seoDescription: null,
      },
      {
        locale: 'fr-FR',
        title: 'ignored',
        subtitle: null,
        summary: null,
        content: null,
        seoTitle: null,
        seoDescription: null,
      },
    ],
    categoryIds: ['cat-1'],
    tagIds: ['tag-1'],
    mediaIds: [],
  }

  it('maps the API detail into a clean form state', () => {
    const form = fromLabDetail(detail)

    expect(form.slug).toBe('agent-workflow-prototype')
    expect(form.status).toBe('PUBLISHED')
    expect(form.publishedAt).toBe('2026-06-21')
    expect(form.translations['zh-CN'].summary).toBe('摘要')
    expect(form.translations['en-US'].title).toBe('')
    expect(form.startDate).toBeUndefined()
    expect(isLabFormDirty(form, fromLabDetail(detail))).toBe(false)
  })

  it('copies relation arrays instead of sharing references', () => {
    const form = fromLabDetail(detail)

    form.categoryIds.push('cat-2')

    expect(detail.categoryIds).toEqual(['cat-1'])
  })
})
