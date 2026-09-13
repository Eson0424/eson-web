import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { AdminLabQueryDto } from './admin-lab-query.dto.js'
import { CreateLabDto } from './create-lab.dto.js'
import { UpdateLabDto } from './update-lab.dto.js'

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'

async function invalidFields(instance: object): Promise<string[]> {
  const errors = await validate(instance)

  return errors.map((error) => error.property).sort()
}

async function toDto<T extends object>(cls: new () => T, payload: Record<string, unknown>): Promise<T> {
  return plainToInstance(cls, payload)
}

describe('CreateLabDto', () => {
  it('accepts a minimal url-safe payload', async () => {
    const dto = await toDto(CreateLabDto, {
      slug: 'agent-workflow-prototype',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
    })

    expect(await invalidFields(dto)).toEqual([])
  })

  it('rejects unsafe slugs, unknown status and unsupported locales', async () => {
    for (const slug of ['Agent Workflow', 'agent_workflow', 'agent--workflow']) {
      const dto = await toDto(CreateLabDto, {
        slug,
        status: 'DRAFT',
        translations: [{ locale: 'zh-CN', title: '标题' }],
      })

      expect(await invalidFields(dto)).toContain('slug')
    }

    const badStatus = await toDto(CreateLabDto, {
      slug: 'agent-workflow',
      status: 'LIVE',
      translations: [{ locale: 'zh-CN', title: '标题' }],
    })

    expect(await invalidFields(badStatus)).toContain('status')

    const badLocale = await toDto(CreateLabDto, {
      slug: 'agent-workflow',
      status: 'DRAFT',
      translations: [{ locale: 'fr-FR', title: 'titre' }],
    })

    expect((await validate(badLocale)).flatMap((error) => error.children ?? []).length).toBeGreaterThan(0)
  })

  it('rejects relation ids that are not UUIDs', async () => {
    const dto = await toDto(CreateLabDto, {
      slug: 'agent-workflow',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: ['not-a-uuid'],
    })

    expect(await invalidFields(dto)).toContain('categoryIds')

    const ok = await toDto(CreateLabDto, {
      slug: 'agent-workflow',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
      categoryIds: [CATEGORY_ID],
    })

    expect(await invalidFields(ok)).toEqual([])
  })

  it('does not expose Work-only date fields (labs table has no start/end date)', async () => {
    const dto = await toDto(CreateLabDto, {
      slug: 'agent-workflow',
      status: 'DRAFT',
      translations: [{ locale: 'zh-CN', title: '标题' }],
    })

    expect(Object.keys(dto)).not.toContain('startDate')
    expect(Object.keys(dto)).not.toContain('endDate')
  })
})

describe('UpdateLabDto', () => {
  it('accepts an empty patch body and still validates provided fields', async () => {
    expect(await invalidFields(await toDto(UpdateLabDto, {}))).toEqual([])
    expect(await invalidFields(await toDto(UpdateLabDto, { slug: 'Not Valid' }))).toEqual(['slug'])
  })
})

describe('AdminLabQueryDto', () => {
  it('applies pagination defaults and rejects out-of-range values', async () => {
    const query = new AdminLabQueryDto()

    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(12)
    expect(await invalidFields(await toDto(AdminLabQueryDto, { pageSize: '101' }))).toContain('pageSize')
    expect(await invalidFields(await toDto(AdminLabQueryDto, { pageSize: '100' }))).toEqual([])
  })

  it('rejects sort / order values outside the whitelist', async () => {
    expect(await invalidFields(await toDto(AdminLabQueryDto, { sort: 'title' }))).toContain('sort')
    expect(await invalidFields(await toDto(AdminLabQueryDto, { order: 'sideways' }))).toContain('order')
    expect(await invalidFields(await toDto(AdminLabQueryDto, { sort: 'publishedAt', order: 'DESC' }))).toEqual([])
  })
})
