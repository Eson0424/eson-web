import { describe, expect, it } from 'vitest'
import {
  createEmptyWritingForm,
  fromWritingDetail,
  hasWritingFormErrors,
  isWritingFormDirty,
  toWritingPayload,
  validateWritingForm,
  writingTranslationSummary,
  type WritingFormState,
} from '~/utils/writing-form'

// Phase 4-D：Admin Writing 表单的纯逻辑契约（共享实现见 content-form.ts）。

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

function makeForm(overrides: Partial<WritingFormState> = {}): WritingFormState {
  return Object.assign(createEmptyWritingForm(), overrides)
}

function withZhTitle(form: WritingFormState, title = '中文文章标题'): WritingFormState {
  form.translations['zh-CN'].title = title

  return form
}

describe('createEmptyWritingForm', () => {
  it('starts as an unsaved zh-CN draft with no relations', () => {
    const form = createEmptyWritingForm()

    expect(form.slug).toBe('')
    expect(form.status).toBe('DRAFT')
    expect(form.featured).toBe(false)
    expect(form.categoryIds).toEqual([])
    expect(form.tagIds).toEqual([])
    expect(form.mediaIds).toEqual([])
  })

  it('has no Work / Lab only fields (links and dates)', () => {
    const form = createEmptyWritingForm()

    expect(form.startDate).toBeUndefined()
    expect(form.endDate).toBeUndefined()
  })
})

describe('validateWritingForm', () => {
  it('rejects an empty form and accepts a slug-safe article', () => {
    const empty = validateWritingForm(createEmptyWritingForm())

    expect(empty.slug).toBe('invalid-slug')
    expect(empty.translations?.['zh-CN']).toBe('title-required')
    expect(hasWritingFormErrors(empty)).toBe(true)
    expect(validateWritingForm(withZhTitle(makeForm({ slug: 'notes-on-agent-workflows' })))).toEqual({})
  })

  it.each(['Notes On Agent', 'notes_on_agent', 'notes--on', '-notes'])(
    'rejects the unsafe slug %s',
    (slug) => {
      expect(validateWritingForm(withZhTitle(makeForm({ slug }))).slug).toBe('invalid-slug')
    },
  )

  it('allows a missing en-US translation but not a missing zh-CN title', () => {
    expect(validateWritingForm(makeForm({ slug: 'notes' })).translations?.['zh-CN']).toBe('title-required')
    expect(validateWritingForm(withZhTitle(makeForm({ slug: 'notes' }))).translations).toBeUndefined()
    expect(writingTranslationSummary(withZhTitle(makeForm())).missing).toEqual(['en-US'])
  })
})

describe('toWritingPayload', () => {
  it('sends excerpt (not summary) for each translated article', () => {
    const form = withZhTitle(makeForm({ slug: 'notes' }))

    form.translations['zh-CN'].excerpt = '  摘要  '
    form.translations['zh-CN'].summary = 'working summary'

    const payload = toWritingPayload(form)
    const translations = payload.translations as Array<Record<string, unknown>>

    expect(translations[0]).toMatchObject({ locale: 'zh-CN', title: '中文文章标题', excerpt: '摘要' })
    expect(translations[0]).not.toHaveProperty('summary')
  })

  it('keeps the Markdown body byte-identical (no trim / escape)', () => {
    const form = withZhTitle(makeForm({ slug: 'notes-on-agent-workflows' }))

    form.translations['zh-CN'].content = MARKDOWN

    const payload = toWritingPayload(form)
    const translations = payload.translations as Array<Record<string, unknown>>

    expect(translations[0]?.content).toBe(MARKDOWN)
    expect(translations[0]?.content).toContain('# Heading')
    expect(translations[0]?.content).toContain('**bold**')
    expect(translations[0]?.content).toContain('- item one')
    expect(translations[0]?.content).toContain('const hello = "world"')
  })

  it('never sends Work / Lab only fields', () => {
    const payload = toWritingPayload(withZhTitle(makeForm({ slug: 'notes' })))

    expect(Object.keys(payload)).not.toContain('githubUrl')
    expect(Object.keys(payload)).not.toContain('startDate')
    expect(Object.keys(payload)).not.toContain('endDate')
    expect(payload.publishedAt).toBeNull()
  })

  it('keeps relations and status flags', () => {
    const form = withZhTitle(makeForm({ slug: 'notes', status: 'PUBLISHED', featured: true }))

    form.categoryIds = ['cat-1']
    form.tagIds = ['tag-1']
    form.mediaIds = ['media-1']

    const payload = toWritingPayload(form)

    expect(payload.status).toBe('PUBLISHED')
    expect(payload.featured).toBe(true)
    expect(payload.categoryIds).toEqual(['cat-1'])
    expect(payload.tagIds).toEqual(['tag-1'])
    expect(payload.mediaIds).toEqual(['media-1'])
  })
})

describe('fromWritingDetail', () => {
  const detail = {
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
      {
        locale: 'fr-FR',
        title: 'ignored',
        subtitle: null,
        excerpt: null,
        content: null,
        seoTitle: null,
        seoDescription: null,
      },
    ],
    categoryIds: ['cat-1'],
    tagIds: [],
    mediaIds: [],
  }

  it('hydrates excerpt + Markdown content into the form', () => {
    const form = fromWritingDetail(detail)

    expect(form.slug).toBe('notes-on-agent-workflows')
    expect(form.translations['zh-CN'].excerpt).toBe('摘要')
    expect(form.translations['zh-CN'].content).toBe(MARKDOWN)
    expect(form.translations['zh-CN'].summary).toBe('')
    expect(form.translations['en-US'].title).toBe('')
    expect(form.publishedAt).toBe('2026-06-21')
  })

  it('is clean right after loading and dirty after an edit', () => {
    const form = fromWritingDetail(detail)
    const edited = fromWritingDetail(detail)

    edited.translations['zh-CN'].content = `${MARKDOWN}\n\n## 追加章节`

    expect(isWritingFormDirty(form, fromWritingDetail(detail))).toBe(false)
    expect(isWritingFormDirty(form, edited)).toBe(true)
  })
})
