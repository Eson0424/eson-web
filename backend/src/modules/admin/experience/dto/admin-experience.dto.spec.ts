import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { EMPLOYMENT_TYPES } from '../../../../common/constants/experience.js'
import { AdminExperienceQueryDto } from './admin-experience-query.dto.js'
import { CreateExperienceDto } from './create-experience.dto.js'
import { UpdateExperienceDto } from './update-experience.dto.js'

async function invalidFields(instance: object): Promise<string[]> {
  const errors = await validate(instance)

  return errors.map((error) => error.property).sort()
}

async function toDto<T extends object>(cls: new () => T, payload: Record<string, unknown>): Promise<T> {
  return plainToInstance(cls, payload)
}

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

describe('CreateExperienceDto', () => {
  it('accepts a minimal payload with one translation', async () => {
    const dto = await toDto(CreateExperienceDto, {
      translations: [{ locale: 'zh-CN', roleName: '软件工程师' }],
    })

    expect(await invalidFields(dto)).toEqual([])
  })

  it('accepts every documented employment type', async () => {
    for (const employmentType of EMPLOYMENT_TYPES) {
      const dto = await toDto(CreateExperienceDto, {
        employmentType,
        translations: [{ locale: 'zh-CN', roleName: '工程师' }],
      })

      expect(await invalidFields(dto)).toEqual([])
    }
  })

  it('rejects an unknown employment type', async () => {
    const dto = await toDto(CreateExperienceDto, {
      employmentType: 'INTERN',
      translations: [{ locale: 'zh-CN', roleName: '工程师' }],
    })

    expect(await invalidFields(dto)).toContain('employmentType')
  })

  it('requires at least one translation and requires roleName', async () => {
    const noTranslations = await toDto(CreateExperienceDto, { sortOrder: 1 })

    expect(await invalidFields(noTranslations)).toContain('translations')

    const missingRole = await toDto(CreateExperienceDto, {
      translations: [{ locale: 'zh-CN' }],
    })

    expect((await validate(missingRole)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)

    const emptyRole = await toDto(CreateExperienceDto, {
      translations: [{ locale: 'zh-CN', roleName: '' }],
    })

    expect((await validate(emptyRole)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)
  })

  it('rejects unsupported locales and invalid dates', async () => {
    const badLocale = await toDto(CreateExperienceDto, {
      translations: [{ locale: 'fr-FR', roleName: 'Ingénieur' }],
    })

    expect((await validate(badLocale)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)

    const badDate = await toDto(CreateExperienceDto, {
      startDate: '2024/01/01',
      translations: [{ locale: 'zh-CN', roleName: '工程师' }],
    })

    expect(await invalidFields(badDate)).toContain('startDate')
  })

  it('rejects Work / Lab / Writing only fields instead of ignoring them', async () => {
    const dto = await toDto(CreateExperienceDto, {
      slug: 'some-slug',
      status: 'PUBLISHED',
      featured: true,
      publishedAt: '2026-01-01',
      coverMediaId: '22222222-2222-4222-8222-222222222222',
      categoryIds: [],
      translations: [{ locale: 'zh-CN', roleName: '工程师', title: '不属于 experience' }],
    })

    const paths = await strictlyRejectedPaths(dto)

    expect(paths).toContain('slug')
    expect(paths).toContain('status')
    expect(paths).toContain('featured')
    expect(paths).toContain('publishedAt')
    expect(paths).toContain('coverMediaId')
    expect(paths).toContain('categoryIds')
    expect(paths).toContain('translations.0.title')
  })
})

describe('UpdateExperienceDto', () => {
  it('accepts an empty patch body and still validates provided fields', async () => {
    expect(await invalidFields(await toDto(UpdateExperienceDto, {}))).toEqual([])
    expect(
      await invalidFields(
        await toDto(UpdateExperienceDto, { employmentType: 'INTERN' }),
      ),
    ).toEqual(['employmentType'])
  })
})

describe('AdminExperienceQueryDto', () => {
  it('applies pagination defaults and caps pageSize', async () => {
    const query = new AdminExperienceQueryDto()

    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(12)
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { pageSize: '101' }))).toContain('pageSize')
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { pageSize: '100' }))).toEqual([])
  })

  it('accepts the Experience sort whitelist and rejects publishedAt', async () => {
    for (const sort of ['createdAt', 'updatedAt', 'sortOrder', 'startDate', 'endDate']) {
      expect(await invalidFields(await toDto(AdminExperienceQueryDto, { sort }))).toEqual([])
    }

    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { sort: 'publishedAt' }))).toContain('sort')
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { sort: 'title' }))).toContain('sort')
  })

  it('rejects unknown filters such as status / featured', async () => {
    const dto = await toDto(AdminExperienceQueryDto, { status: 'PUBLISHED', featured: 'true' })
    const paths = await strictlyRejectedPaths(dto)

    expect(paths).toContain('status')
    expect(paths).toContain('featured')
  })

  it('lowercases order and validates locale / search length', async () => {
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { order: 'DESC' }))).toEqual([])
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { order: 'sideways' }))).toContain('order')
    expect(await invalidFields(await toDto(AdminExperienceQueryDto, { locale: 'fr-FR' }))).toContain('locale')
    expect(
      await invalidFields(await toDto(AdminExperienceQueryDto, { search: 'x'.repeat(101) })),
    ).toContain('search')
  })
})
