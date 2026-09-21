import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { AdminContactQueryDto } from './admin-contact-query.dto.js'
import { UpdateContactMessageDto } from './update-contact-message.dto.js'

async function invalidFields(instance: object): Promise<string[]> {
  const errors = await validate(instance)

  return errors.map((error) => error.property).sort()
}

describe('AdminContactQueryDto', () => {
  it('accepts the documented query surface', async () => {
    const dto = plainToInstance(AdminContactQueryDto, {
      status: 'UNREAD',
      page: '2',
      pageSize: '50',
      sort: 'createdAt',
      order: 'DESC',
    })

    expect(await invalidFields(dto)).toEqual([])
    expect(dto.page).toBe(2)
    expect(dto.pageSize).toBe(50)
    // 大小写不敏感：客户端传 DESC 也应合法
    expect(dto.order).toBe('desc')
  })

  it('rejects unknown status and unsupported sort fields', async () => {
    expect(await invalidFields(plainToInstance(AdminContactQueryDto, { status: 'PENDING' }))).toContain('status')
    expect(await invalidFields(plainToInstance(AdminContactQueryDto, { sort: 'subject' }))).toContain('sort')
  })

  it('rejects pageSize above the API maximum', async () => {
    expect(await invalidFields(plainToInstance(AdminContactQueryDto, { pageSize: '500' }))).toContain('pageSize')
  })
})

describe('UpdateContactMessageDto', () => {
  it('accepts the three real statuses', async () => {
    for (const status of ['UNREAD', 'READ', 'ARCHIVED']) {
      expect(await invalidFields(plainToInstance(UpdateContactMessageDto, { status }))).toEqual([])
    }
  })

  it('requires status and rejects unknown values', async () => {
    expect(await invalidFields(plainToInstance(UpdateContactMessageDto, {}))).toContain('status')
    expect(await invalidFields(plainToInstance(UpdateContactMessageDto, { status: 'DELETED' }))).toContain('status')
  })
})
