import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../common/errors/app-error.js'
import { ContentQueryDto } from '../../common/dto/content-query.dto.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { WorkService } from './work.service.js'

const publishedWork = {
  id: 'work-1',
  slug: 'eson-web',
  status: 'PUBLISHED',
  featured: true,
  sortOrder: 1,
  githubUrl: null,
  demoUrl: null,
  projectUrl: null,
  startDate: new Date(Date.UTC(2026, 0, 1)),
  endDate: null,
  publishedAt: new Date(Date.UTC(2026, 8, 1)),
  createdAt: new Date(),
  updatedAt: new Date(),
  cover: null,
  // detail include 会带出 gallery 关系（Phase 4-F.6.1）
  media: [],
  translations: [
    { id: 't1', workId: 'work-1', locale: 'zh-CN', title: '中文标题', subtitle: null, summary: '摘要', content: '正文', seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() },
  ],
  categories: [],
  tags: [],
}

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    work: {
      findMany: vi.fn().mockResolvedValue([publishedWork]),
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue(publishedWork),
      ...overrides,
    },
  }

  return { prisma, service: new WorkService(prisma as unknown as PrismaService) }
}

describe('WorkService', () => {
  let context: ReturnType<typeof createService>

  beforeEach(() => {
    context = createService()
  })

  it('only queries PUBLISHED work with a publishedAt value', async () => {
    const query = Object.assign(new ContentQueryDto(), { page: 1, pageSize: 12 })

    const result = await context.prisma.work.findMany.mock.calls[0] === undefined
      ? await context.service.list(query, 'zh-CN')
      : undefined

    const args = context.prisma.work.findMany.mock.calls[0]?.[0]

    expect(args?.where).toMatchObject({ status: 'PUBLISHED', publishedAt: { not: null } })
    expect(args?.skip).toBe(0)
    expect(args?.take).toBe(12)
    expect(result?.meta).toEqual({ page: 1, pageSize: 12, total: 1, totalPages: 1 })
  })

  it('maps the requested locale and flags zh-CN fallback', async () => {
    const result = await context.service.findBySlug('eson-web', 'en-US')

    expect(result.title).toBe('中文标题')
    expect(result.locale).toBe('zh-CN')
    expect(result.localeFallback).toBe(true)
  })

  it('throws NOT_FOUND when the slug is not published', async () => {
    const { service } = createService({ findFirst: vi.fn().mockResolvedValue(null) })

    await expect(service.findBySlug('missing', 'zh-CN')).rejects.toBeInstanceOf(AppError)
    await expect(service.findBySlug('missing', 'zh-CN')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
