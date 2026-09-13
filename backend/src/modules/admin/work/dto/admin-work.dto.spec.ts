import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { AdminWorkQueryDto } from './admin-work-query.dto.js'
import { CreateWorkDto } from './create-work.dto.js'
import { UpdateWorkDto } from './update-work.dto.js'

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'

/** 返回出错的字段名（与 ValidationPipe 的 400 VALIDATION_ERROR 行为对应） */
async function invalidFields(instance: object): Promise<string[]> {
  const errors = await validate(instance)

  return errors.map((error) => error.property).sort()
}

async function toDto<T extends object>(cls: new () => T, payload: Record<string, unknown>): Promise<T> {
  return plainToInstance(cls, payload)
}

describe('CreateWorkDto', () => {
  it('accepts a minimal url-safe payload', async () => {
    const dto = await toDto(CreateWorkDto, {
      slug: 'eson-web',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
    })

    expect(await invalidFields(dto)).toEqual([])
  })

  it('rejects slugs that are not lowercase url-safe', async () => {
    for (const slug of ['Eson Web', 'ESON_WEB', 'eson--web', '-eson', 'eson web']) {
      const dto = await toDto(CreateWorkDto, {
        slug,
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '标题' }],
      })

      expect(await invalidFields(dto)).toContain('slug')
    }
  })

  it('rejects unknown status and unsupported locales', async () => {
    const dto = await toDto(CreateWorkDto, {
      slug: 'eson-web',
      status: 'LIVE',
      translations: [{ locale: 'fr-FR', title: 'titre' }],
    })
    const errors = await validate(dto)

    expect(errors.map((error) => error.property)).toContain('status')
    expect(errors.flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)
  })

  it('requires at least a title per translation', async () => {
    const dto = await toDto(CreateWorkDto, {
      slug: 'eson-web',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN' }],
    })
    const errors = await validate(dto)
    const translationChildren = errors.flatMap((error) => error.children ?? [])

    expect(translationChildren.length).toBeGreaterThan(0)
  })

  it('rejects non-uuid relation ids and non-array relations', async () => {
    const dto = await toDto(CreateWorkDto, {
      slug: 'eson-web',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: ['not-a-uuid'],
    })

    expect(await invalidFields(dto)).toContain('categoryIds')

    const ok = await toDto(CreateWorkDto, {
      slug: 'eson-web',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: [CATEGORY_ID],
    })

    expect(await invalidFields(ok)).toEqual([])
  })
})

describe('UpdateWorkDto', () => {
  it('accepts an empty patch body (all fields optional)', async () => {
    expect(await invalidFields(await toDto(UpdateWorkDto, {}))).toEqual([])
  })

  it('still validates provided fields', async () => {
    const dto = await toDto(UpdateWorkDto, { slug: 'Not Valid', featured: 'yes' })

    expect(await invalidFields(dto)).toEqual(['featured', 'slug'])
  })
})

describe('AdminWorkQueryDto', () => {
  it('applies the pagination defaults (page 1 / pageSize 12)', () => {
    const query = new AdminWorkQueryDto()

    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(12)
    expect(query.skip).toBe(0)
    expect(query.take).toBe(12)
  })

  it('caps pageSize at 100 and rejects 0 or negative pages', async () => {
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { pageSize: '101' }))).toContain('pageSize')
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { pageSize: '100' }))).toEqual([])
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { page: '0' }))).toContain('page')
  })

  it('rejects sort / order values outside the whitelist', async () => {
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { sort: 'title' }))).toContain('sort')
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { order: 'sideways' }))).toContain('order')
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { sort: 'publishedAt', order: 'ASC' }))).toEqual([])
  })

  it('rejects unknown status and non-slug category/tag filters', async () => {
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { status: 'LIVE' }))).toContain('status')
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { category: 'Not Slug' }))).toContain('category')
    expect(await invalidFields(await toDto(AdminWorkQueryDto, { tag: 'Not Slug' }))).toContain('tag')
  })
})
