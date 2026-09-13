import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { AdminWritingQueryDto } from './admin-writing-query.dto.js'
import { CreateWritingDto } from './create-writing.dto.js'
import { UpdateWritingDto } from './update-writing.dto.js'

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'

const MARKDOWN = '# Heading\n\n**bold**\n\n- item\n\n```js\nconst hello = "world"\n```'

async function invalidFields(instance: object): Promise<string[]> {
  const errors = await validate(instance)

  return errors.map((error) => error.property).sort()
}

/** 与 Nest ValidationPipe 一致的严格模式：未知字段直接判错（forbidNonWhitelisted） */
async function strictlyRejectedFields(instance: object): Promise<string[]> {
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true })

  return errors.map((error) => error.property).sort()
}

/** 展开嵌套校验错误的路径（例如 translations.0.summary） */
function errorPaths(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property

    return error.children && error.children.length > 0 ? errorPaths(error.children, path) : [path]
  })
}

async function strictlyRejectedPaths(instance: object): Promise<string[]> {
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true })

  return errorPaths(errors).sort()
}

async function toDto<T extends object>(cls: new () => T, payload: Record<string, unknown>): Promise<T> {
  return plainToInstance(cls, payload)
}

describe('CreateWritingDto', () => {
  it('accepts a minimal payload with Markdown content', async () => {
    const dto = await toDto(CreateWritingDto, {
      slug: 'notes-on-agent-workflows',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题', excerpt: '摘要', content: MARKDOWN }],
    })

    expect(await invalidFields(dto)).toEqual([])
    expect(dto.translations[0]?.content).toBe(MARKDOWN)
    expect(dto.translations[0]?.excerpt).toBe('摘要')
  })

  it('rejects unsafe slugs, unknown status and unsupported locales', async () => {
    for (const slug of ['Notes On Agent', 'notes_on_agent', 'notes--on']) {
      const dto = await toDto(CreateWritingDto, {
        slug,
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '标题' }],
      })

      expect(await invalidFields(dto)).toContain('slug')
    }

    expect(
      await invalidFields(
        await toDto(CreateWritingDto, {
          slug: 'notes',
          status: 'LIVE',
          translations: [{ locale: 'zh-CN', title: '标题' }],
        }),
      ),
    ).toContain('status')

    const badLocale = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      translations: [{ locale: 'fr-FR', title: 'titre' }],
    })

    expect((await validate(badLocale)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)
  })

  it('requires at least one translation with a title', async () => {
    const noTranslations = await toDto(CreateWritingDto, { slug: 'notes', status: 'DRAFT' })

    expect(await invalidFields(noTranslations)).toContain('translations')

    const missingTitle = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN' }],
    })

    expect((await validate(missingTitle)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)
  })

  it('rejects relation ids that are not UUIDs and accepts valid ones', async () => {
    const invalid = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: ['not-a-uuid'],
    })

    expect(await invalidFields(invalid)).toContain('categoryIds')

    const valid = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: [CATEGORY_ID],
    })

    expect(await invalidFields(valid)).toEqual([])
  })

  it('does not expose Work / Lab only fields (links, dates, summary)', async () => {
    const dto = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      githubUrl: 'https://github.com/example',
      startDate: '2026-01-01',
      translations: [{ locale: 'zh-CN', title: '标题', summary: '不属于 writing' }],
    })

    // ValidationPipe（whitelist + forbidNonWhitelisted）会直接判错而不是静默忽略
    const paths = await strictlyRejectedPaths(dto)

    expect(paths).toContain('githubUrl')
    expect(paths).toContain('startDate')
    expect(paths).toContain('translations.0.summary')
  })

  it('keeps excerpt and strips summary when only whitelist is enabled', async () => {
    const dto = await toDto(CreateWritingDto, {
      slug: 'notes',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题', summary: 'x', excerpt: 'y' }],
    })

    await validate(dto, { whitelist: true })

    expect(dto.translations[0]?.excerpt).toBe('y')
    expect(dto.translations[0]).not.toHaveProperty('summary')
  })
})

describe('UpdateWritingDto', () => {
  it('accepts an empty patch body and still validates provided fields', async () => {
    expect(await invalidFields(await toDto(UpdateWritingDto, {}))).toEqual([])
    expect(await invalidFields(await toDto(UpdateWritingDto, { slug: 'Not Valid' }))).toEqual(['slug'])
  })
})

describe('AdminWritingQueryDto', () => {
  it('applies pagination defaults and rejects out-of-range values', async () => {
    const query = new AdminWritingQueryDto()

    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(12)
    expect(await invalidFields(await toDto(AdminWritingQueryDto, { pageSize: '101' }))).toContain('pageSize')
    expect(await invalidFields(await toDto(AdminWritingQueryDto, { pageSize: '100' }))).toEqual([])
  })

  it('rejects sort / order values outside the whitelist', async () => {
    expect(await invalidFields(await toDto(AdminWritingQueryDto, { sort: 'title' }))).toContain('sort')
    expect(await invalidFields(await toDto(AdminWritingQueryDto, { order: 'sideways' }))).toContain('order')
    expect(await invalidFields(await toDto(AdminWritingQueryDto, { sort: 'publishedAt', order: 'DESC' }))).toEqual([])
  })
})
