import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLabService } from '~/services/lab.service'
import { toGalleryItems, useWorkService } from '~/services/work.service'

// Phase 4-F.6.1：Public Gallery 数据链路（API detail.gallery → WorkGalleryItem / LabGalleryItem）。
// 关键契约：顺序完全沿用 backend（不排序 / 不反转 / 不去重），caption 允许为空，只暴露公开字段。

const fetchMock = vi.fn()

function media(label: string, overrides: Record<string, unknown> = {}) {
  return {
    url: `http://api.test/media/${label}.png`,
    alt: `${label} alt`,
    width: 1600,
    height: 900,
    ...overrides,
  }
}

function workDetailPayload(gallery?: unknown) {
  return {
    success: true,
    data: {
      id: 'w1',
      slug: 'eson-web',
      title: 'Eson_web',
      summary: 'summary',
      featured: true,
      categories: [],
      tags: [],
      ...(gallery === undefined ? {} : { gallery }),
    },
    meta: null,
  }
}

function labDetailPayload(gallery?: unknown) {
  return {
    success: true,
    data: {
      id: 'l1',
      slug: 'interface-experiment',
      title: 'Interface Experiment',
      summary: 'summary',
      featured: false,
      categories: [],
      tags: [],
      ...(gallery === undefined ? {} : { gallery }),
    },
    meta: null,
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test/api/v1' } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('toGalleryItems (pure mapper)', () => {
  it('returns an empty array for missing or malformed input (never null / undefined)', () => {
    expect(toGalleryItems(undefined)).toEqual([])
    expect(toGalleryItems([])).toEqual([])
    expect(toGalleryItems(null as unknown as undefined)).toEqual([])
  })

  it('maps caption null to an empty string and keeps public media fields only', () => {
    expect(
      toGalleryItems([
        { id: 'm1', caption: null, sortOrder: 0, media: media('one') },
        { id: 'm2', caption: 'Caption', sortOrder: 1, media: media('two', { width: undefined, height: undefined }) },
      ]),
    ).toEqual([
      {
        id: 'm1',
        caption: '',
        media: { src: 'http://api.test/media/one.png', alt: 'one alt', width: 1600, height: 900 },
      },
      {
        id: 'm2',
        caption: 'Caption',
        media: { src: 'http://api.test/media/two.png', alt: 'two alt', width: undefined, height: undefined },
      },
    ])
  })

  it('preserves the API order exactly (no sort, no reverse)', () => {
    const result = toGalleryItems([
      { id: 'c', caption: null, sortOrder: 2, media: media('c') },
      { id: 'a', caption: null, sortOrder: 0, media: media('a') },
      { id: 'b', caption: null, sortOrder: 1, media: media('b') },
    ])

    // backend 已按 sort_order 返回；即使传入乱序，mapper 也不得重排
    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('keeps an entry without media instead of dropping it', () => {
    expect(toGalleryItems([{ id: 'm1', caption: null }])).toEqual([
      { id: 'm1', caption: '', media: undefined },
    ])
  })
})

describe('work detail gallery mapping', () => {
  it('returns an empty gallery when the API omits it', async () => {
    fetchMock.mockResolvedValue(workDetailPayload())

    const detail = await useWorkService().detail('eson-web', 'zh-CN')

    expect(detail.gallery).toEqual([])
  })

  it('maps a single gallery item with media metadata', async () => {
    fetchMock.mockResolvedValue(
      workDetailPayload([{ id: 'm1', caption: null, sortOrder: 0, media: media('one') }]),
    )

    const detail = await useWorkService().detail('eson-web', 'zh-CN')

    expect(detail.gallery).toHaveLength(1)
    expect(detail.gallery[0]).toEqual({
      id: 'm1',
      caption: '',
      media: { src: 'http://api.test/media/one.png', alt: 'one alt', width: 1600, height: 900 },
    })
  })

  it('preserves the backend order for multiple items', async () => {
    fetchMock.mockResolvedValue(
      workDetailPayload([
        { id: 'm2', caption: null, sortOrder: 0, media: media('two') },
        { id: 'm1', caption: 'First captured', sortOrder: 1, media: media('one') },
        { id: 'm3', caption: null, sortOrder: 2, media: media('three') },
      ]),
    )

    const detail = await useWorkService().detail('eson-web', 'zh-CN')

    expect(detail.gallery.map((item) => item.id)).toEqual(['m2', 'm1', 'm3'])
    expect(detail.gallery[1]?.caption).toBe('First captured')
  })

  it('keeps the cover even when the same media is also in the gallery', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        ...workDetailPayload([{ id: 'm1', caption: null, sortOrder: 0, media: media('one') }]).data,
        cover: media('one'),
      },
      meta: null,
    })

    const detail = await useWorkService().detail('eson-web', 'zh-CN')

    expect(detail.cover?.src).toBe('http://api.test/media/one.png')
    expect(detail.gallery).toHaveLength(1)
    expect(detail.gallery[0]?.id).toBe('m1')
  })
})

describe('lab detail gallery mapping', () => {
  it('returns an empty gallery when the API omits it', async () => {
    fetchMock.mockResolvedValue(labDetailPayload())

    const detail = await useLabService().detail('interface-experiment', 'zh-CN')

    expect(detail.gallery).toEqual([])
  })

  it('preserves the backend order for multiple items', async () => {
    fetchMock.mockResolvedValue(
      labDetailPayload([
        { id: 'm1', caption: null, sortOrder: 0, media: media('one') },
        { id: 'm2', caption: null, sortOrder: 1, media: media('two') },
      ]),
    )

    const detail = await useLabService().detail('interface-experiment', 'zh-CN')

    expect(detail.gallery.map((item) => item.id)).toEqual(['m1', 'm2'])
    expect(detail.gallery[0]?.media?.src).toBe('http://api.test/media/one.png')
  })
})
