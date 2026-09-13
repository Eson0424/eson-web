import { describe, expect, it } from 'vitest'
import {
  EMPLOYMENT_TYPES,
  createEmptyExperienceForm,
  experienceFormErrorKey,
  experienceTranslationSummary,
  fromExperienceDetail,
  hasExperienceFormErrors,
  isExperienceFormDirty,
  toExperiencePayload,
  validateExperienceForm,
  type ExperienceFormState,
} from '~/utils/experience-form'

// Phase 4-E：Admin Experience 表单的纯逻辑契约（DATABASE §20–22）。

function makeForm(overrides: Partial<ExperienceFormState> = {}): ExperienceFormState {
  return Object.assign(createEmptyExperienceForm(), overrides)
}

function withZhRole(form: ExperienceFormState, roleName = '软件工程师'): ExperienceFormState {
  form.translations['zh-CN'].roleName = roleName

  return form
}

describe('createEmptyExperienceForm', () => {
  it('starts empty with no status / slug / featured fields', () => {
    const form = createEmptyExperienceForm()

    expect(form.sortOrder).toBe(0)
    expect(form.employmentType).toBe('')
    expect(form.location).toBe('')
    expect(form.startDate).toBe('')
    expect(form.endDate).toBe('')
    expect(form.isCurrent).toBe(false)
    expect(Object.keys(form)).not.toContain('slug')
    expect(Object.keys(form)).not.toContain('status')
    expect(Object.keys(form)).not.toContain('featured')
  })

  it('creates a blank translation for every supported locale', () => {
    const form = createEmptyExperienceForm()

    expect(Object.keys(form.translations)).toEqual(['zh-CN', 'en-US'])

    for (const locale of ['zh-CN', 'en-US'] as const) {
      expect(form.translations[locale]).toEqual({
        roleName: '',
        companyName: '',
        summary: '',
        content: '',
      })
    }
  })
})

describe('validateExperienceForm', () => {
  it('requires a zh-CN role name but allows a missing en-US translation', () => {
    const empty = validateExperienceForm(createEmptyExperienceForm())

    expect(empty.translations?.['zh-CN']).toBe('role-required')
    expect(hasExperienceFormErrors(empty)).toBe(true)
    expect(validateExperienceForm(withZhRole(makeForm()))).toEqual({})
  })

  it('rejects isCurrent combined with endDate', () => {
    const errors = validateExperienceForm(
      withZhRole(makeForm({ isCurrent: true, endDate: '2025-01-01' })),
    )

    expect(errors.dates).toBe('current-with-end-date')
    expect(experienceFormErrorKey(errors)).toBe('current-with-end-date')
  })

  it('rejects a reversed date range', () => {
    const errors = validateExperienceForm(
      withZhRole(makeForm({ startDate: '2025-01-01', endDate: '2024-01-01' })),
    )

    expect(errors.dates).toBe('invalid-date-range')
  })

  it('accepts an empty endDate for a current role', () => {
    expect(
      validateExperienceForm(withZhRole(makeForm({ isCurrent: true, startDate: '2024-01-01' }))),
    ).toEqual({})
  })

  it('enforces field length limits', () => {
    const roleTooLong = validateExperienceForm(withZhRole(makeForm(), 'a'.repeat(201)))

    expect(roleTooLong.translations?.['zh-CN']).toBe('role-too-long')

    const summaryTooLong = withZhRole(makeForm())

    summaryTooLong.translations['zh-CN'].summary = 'a'.repeat(2001)

    expect(validateExperienceForm(summaryTooLong).translations?.['zh-CN']).toBe('summary-too-long')
  })

  it('only accepts the documented employment types', () => {
    for (const employmentType of EMPLOYMENT_TYPES) {
      expect(validateExperienceForm(withZhRole(makeForm({ employmentType }))).employmentType).toBeUndefined()
    }

    const invalid = withZhRole(
      makeForm({ employmentType: 'INTERN' as ExperienceFormState['employmentType'] }),
    )

    expect(validateExperienceForm(invalid).employmentType).toBe('invalid-employment-type')
  })
})

describe('experienceTranslationSummary', () => {
  it('reports which locales still need a role name', () => {
    expect(experienceTranslationSummary(createEmptyExperienceForm()).missing).toEqual(['zh-CN', 'en-US'])
    expect(experienceTranslationSummary(withZhRole(makeForm())).missing).toEqual(['en-US'])
  })
})

describe('toExperiencePayload', () => {
  it('only sends translations that have a role name', () => {
    const form = withZhRole(makeForm({ sortOrder: 3, employmentType: 'FULL_TIME', location: ' 上海 ' }))

    form.translations['zh-CN'].companyName = ' 示例公司 '
    form.translations['zh-CN'].summary = ' 摘要 '
    form.translations['zh-CN'].content = '详细内容\n\n第二段'

    const payload = toExperiencePayload(form)

    expect(payload).toMatchObject({
      sortOrder: 3,
      employmentType: 'FULL_TIME',
      location: '上海',
      startDate: null,
      endDate: null,
      isCurrent: false,
    })
    expect(payload.translations).toEqual([
      {
        locale: 'zh-CN',
        roleName: '软件工程师',
        companyName: '示例公司',
        summary: '摘要',
        content: '详细内容\n\n第二段',
      },
    ])
  })

  it('never sends an endDate when the role is current', () => {
    const payload = toExperiencePayload(
      withZhRole(makeForm({ isCurrent: true, startDate: '2024-01-01', endDate: '2025-01-01' })),
    )

    expect(payload.isCurrent).toBe(true)
    expect(payload.endDate).toBeNull()
  })

  it('normalises empty optional values to null / undefined', () => {
    const payload = toExperiencePayload(withZhRole(makeForm()))

    expect(payload.employmentType).toBeNull()
    expect(payload.location).toBeNull()
    expect(payload.startDate).toBeNull()
    expect(payload.endDate).toBeNull()
    expect((payload.translations[0] as Record<string, unknown>).companyName).toBeUndefined()
    expect((payload.translations[0] as Record<string, unknown>).content).toBeUndefined()
  })
})

describe('fromExperienceDetail', () => {
  const detail = {
    id: 'e1',
    sortOrder: 2,
    employmentType: 'CONTRACT',
    location: 'Shanghai',
    startDate: '2024-01-01',
    endDate: null,
    isCurrent: true,
    translations: [
      {
        locale: 'zh-CN',
        roleName: '软件工程师',
        companyName: '示例公司',
        summary: '摘要',
        content: '正文',
      },
      {
        locale: 'fr-FR',
        roleName: 'ignored',
        companyName: null,
        summary: null,
        content: null,
      },
    ],
  }

  it('hydrates the form and ignores unsupported locales', () => {
    const form = fromExperienceDetail(detail)

    expect(form).toMatchObject({
      sortOrder: 2,
      employmentType: 'CONTRACT',
      location: 'Shanghai',
      startDate: '2024-01-01',
      endDate: '',
      isCurrent: true,
    })
    expect(form.translations['zh-CN']).toEqual({
      roleName: '软件工程师',
      companyName: '示例公司',
      summary: '摘要',
      content: '正文',
    })
    expect(form.translations['en-US'].roleName).toBe('')
  })

  it('is clean right after loading and dirty after an edit', () => {
    const form = fromExperienceDetail(detail)
    const edited = fromExperienceDetail(detail)

    edited.translations['zh-CN'].summary = '改过的摘要'

    expect(isExperienceFormDirty(form, fromExperienceDetail(detail))).toBe(false)
    expect(isExperienceFormDirty(form, edited)).toBe(true)
  })
})
