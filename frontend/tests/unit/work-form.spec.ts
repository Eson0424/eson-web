import { describe, expect, it } from 'vitest'
import {
  createEmptyWorkForm,
  fromWorkDetail,
  hasWorkFormErrors,
  isWorkFormDirty,
  toWorkPayload,
  translationSummary,
  validateWorkForm,
  type WorkFormState,
} from '~/utils/work-form'

// Phase 4-B：Admin Work 表单的纯逻辑契约。

function makeForm(overrides: Partial<WorkFormState> = {}): WorkFormState {
  return Object.assign(createEmptyWorkForm(), overrides)
}

function withZhTitle(form: WorkFormState, title = '中文标题'): WorkFormState {
  form.translations['zh-CN'].title = title

  return form
}

describe('createEmptyWorkForm', () => {
  it('starts as an unsaved zh-CN draft with no relations', () => {
    const form = createEmptyWorkForm()

    expect(form.slug).toBe('')
    expect(form.status).toBe('DRAFT')
    expect(form.featured).toBe(false)
    expect(form.sortOrder).toBe(0)
    expect(form.coverMediaId).toBeNull()
    expect(form.publishedAt).toBe('')
    expect(form.categoryIds).toEqual([])
    expect(form.tagIds).toEqual([])
    expect(form.mediaIds).toEqual([])
  })

  it('creates a blank translation for every supported locale', () => {
    const form = createEmptyWorkForm()

    expect(Object.keys(form.translations)).toEqual(['zh-CN', 'en-US'])

    for (const locale of ['zh-CN', 'en-US'] as const) {
      expect(form.translations[locale]).toEqual({
        title: '',
        subtitle: '',
        summary: '',
        excerpt: '',
        content: '',
        seoTitle: '',
        seoDescription: '',
      })
    }
  })
})

describe('validateWorkForm', () => {
  it('rejects an empty form', () => {
    const errors = validateWorkForm(createEmptyWorkForm())

    expect(errors.slug).toBe('invalid-slug')
    expect(errors.translations?.['zh-CN']).toBe('title-required')
    expect(hasWorkFormErrors(errors)).toBe(true)
  })

  it('accepts a slug-safe form with a zh-CN title', () => {
    const form = withZhTitle(makeForm({ slug: 'eson-web' }))

    expect(validateWorkForm(form)).toEqual({})
    expect(hasWorkFormErrors(validateWorkForm(form))).toBe(false)
  })

  it.each(['Eson Web', 'ESON_WEB', 'eson--web', '-eson', 'eson web', 'eson_web', '作品'])(
    'rejects the unsafe slug %s',
    (slug) => {
      const errors = validateWorkForm(withZhTitle(makeForm({ slug })))

      expect(errors.slug).toBe('invalid-slug')
    },
  )

  it('requires a zh-CN title but allows a missing en-US translation', () => {
    const missingZh = validateWorkForm(makeForm({ slug: 'eson-web' }))
    const missingEn = validateWorkForm(withZhTitle(makeForm({ slug: 'eson-web' })))

    expect(missingZh.translations?.['zh-CN']).toBe('title-required')
    expect(missingEn.translations).toBeUndefined()
  })

  it('rejects titles longer than 200 characters', () => {
    const errors = validateWorkForm(withZhTitle(makeForm({ slug: 'eson-web' }), 'a'.repeat(201)))

    expect(errors.translations?.['zh-CN']).toBe('title-too-long')
  })

  it('requires http(s) URLs when a link is provided', () => {
    expect(validateWorkForm(withZhTitle(makeForm({ slug: 'eson-web', githubUrl: 'github.com/eson' }))).urls)
      .toBe('invalid-url')
    expect(validateWorkForm(withZhTitle(makeForm({ slug: 'eson-web', demoUrl: 'https://example.com' }))).urls)
      .toBeUndefined()
    expect(validateWorkForm(withZhTitle(makeForm({ slug: 'eson-web' }))).urls).toBeUndefined()
  })
})

describe('translationSummary', () => {
  it('reports which locales still need a title', () => {
    const empty = translationSummary(createEmptyWorkForm())
    const zhOnly = translationSummary(withZhTitle(makeForm({ slug: 'eson-web' })))

    expect(empty).toEqual({ 'zh-CN': false, 'en-US': false, missing: ['zh-CN', 'en-US'] })
    expect(zhOnly).toEqual({ 'zh-CN': true, 'en-US': false, missing: ['en-US'] })
  })
})

describe('toWorkPayload', () => {
  it('only sends translations that actually have a title', () => {
    const form = withZhTitle(makeForm({ slug: '  eson-web  ' }))

    form.translations['zh-CN'].summary = '  摘要  '

    const payload = toWorkPayload(form)

    expect(payload.slug).toBe('eson-web')
    expect(payload.translations).toEqual([{ locale: 'zh-CN', title: '中文标题', summary: '摘要' }])
  })

  it('normalises empty optional fields to null / undefined', () => {
    const payload = toWorkPayload(withZhTitle(makeForm({ slug: 'eson-web' })))

    expect(payload.githubUrl).toBeNull()
    expect(payload.demoUrl).toBeNull()
    expect(payload.projectUrl).toBeNull()
    expect(payload.startDate).toBeNull()
    expect(payload.endDate).toBeNull()
    expect(payload.publishedAt).toBeNull()
    expect(payload.coverMediaId).toBeNull()
  })

  it('keeps both locales and relation ids when they are filled', () => {
    const form = withZhTitle(makeForm({ slug: 'eson-web', status: 'PUBLISHED', featured: true }))

    form.translations['en-US'].title = 'English title'
    form.categoryIds = ['cat-1']
    form.tagIds = ['tag-1']
    form.mediaIds = ['media-1', 'media-2']

    const payload = toWorkPayload(form)

    expect(payload.status).toBe('PUBLISHED')
    expect(payload.featured).toBe(true)
    expect(payload.translations.map((translation) => translation.locale)).toEqual(['zh-CN', 'en-US'])
    expect(payload.categoryIds).toEqual(['cat-1'])
    expect(payload.tagIds).toEqual(['tag-1'])
    expect(payload.mediaIds).toEqual(['media-1', 'media-2'])
  })
})

describe('fromWorkDetail', () => {
  const detail = {
    slug: 'eson-web',
    status: 'PUBLISHED' as const,
    featured: true,
    sortOrder: 2,
    coverMediaId: 'media-cover',
    githubUrl: 'https://github.com/eson',
    demoUrl: null,
    projectUrl: null,
    startDate: '2026-01-01',
    endDate: null,
    publishedAt: '2026-06-21T00:00:00.000Z',
    translations: [
      {
        locale: 'zh-CN',
        title: 'Eson_web',
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
    mediaIds: ['media-1'],
  }

  it('maps nulls to empty strings and shortens publishedAt to a date input value', () => {
    const form = fromWorkDetail(detail)

    expect(form.slug).toBe('eson-web')
    expect(form.status).toBe('PUBLISHED')
    expect(form.demoUrl).toBe('')
    expect(form.publishedAt).toBe('2026-06-21')
    expect(form.translations['zh-CN'].subtitle).toBe('')
    expect(form.translations['zh-CN'].summary).toBe('摘要')
  })

  it('ignores unsupported locales and copies relation arrays', () => {
    const form = fromWorkDetail(detail)

    expect(form.translations['en-US'].title).toBe('')
    expect(form.categoryIds).toEqual(['cat-1'])

    form.categoryIds.push('cat-2')

    expect(detail.categoryIds).toEqual(['cat-1'])
  })

  it('treats a round-tripped detail as clean', () => {
    const form = fromWorkDetail(detail)
    const edited = fromWorkDetail(detail)

    edited.translations['zh-CN'].title = '改过的标题'

    expect(isWorkFormDirty(form, fromWorkDetail(detail))).toBe(false)
    expect(isWorkFormDirty(form, edited)).toBe(true)
  })
})
