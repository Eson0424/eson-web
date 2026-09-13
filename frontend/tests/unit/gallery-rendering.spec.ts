import { describe, expect, it } from 'vitest'
import { toCoverImage } from '~/utils/cover'
import {
  GALLERY_FALLBACK_RATIO,
  normalizeGalleryCaption,
  toGalleryImageLayout,
  toGalleryRows,
} from '~/utils/gallery'
import type { WorkGalleryItem } from '~/types/work'

// Phase 4-F.6.2：Public Gallery 渲染决策（固有比例 / 不裁切 / caption DOM / alt 回退）。
// 组件本身没有 component test runner，因此把全部判定逻辑收敛到这里，DOM 级行为由浏览器 QA 验证。

const API_BASE = 'http://api.test:3001/api/v1'

function item(overrides: Partial<WorkGalleryItem> = {}): WorkGalleryItem {
  return {
    id: 'm1',
    caption: '',
    media: { src: '/media/a.png', alt: 'A', width: 1200, height: 800 },
    ...overrides,
  }
}

describe('toGalleryRows', () => {
  it('returns an empty list for an empty gallery', () => {
    expect(toGalleryRows([])).toEqual([])
  })

  it('maps one item and multiple items while preserving the API order', () => {
    const rows = toGalleryRows([
      item({ id: 'c' }),
      item({ id: 'a' }),
      item({ id: 'b' }),
    ])

    expect(rows.map((row) => row.id)).toEqual(['c', 'a', 'b'])
    expect(rows).toHaveLength(3)
  })

  it('keeps the original item as source (no re-shaping of gallery data)', () => {
    const source = item({ id: 'm9' })
    const [row] = toGalleryRows([source])

    expect(row?.source).toBe(source)
  })

  it('normalizes caption null / empty / whitespace to null (no caption DOM)', () => {
    expect(toGalleryRows([item({ caption: '' })])[0]?.caption).toBeNull()
    expect(toGalleryRows([item({ caption: '   ' })])[0]?.caption).toBeNull()
    expect(toGalleryRows([item({ caption: null as unknown as string })])[0]?.caption).toBeNull()
  })

  it('keeps a real caption, trimmed', () => {
    expect(toGalleryRows([item({ caption: '  Admin dashboard  ' })])[0]?.caption).toBe(
      'Admin dashboard',
    )
  })

  it('keeps an entry without media instead of dropping it', () => {
    const [row] = toGalleryRows([item({ media: undefined })])

    expect(row?.media).toBeNull()
    expect(row?.id).toBe('m1')
  })
})

describe('toGalleryImageLayout (intrinsic ratio, never crop)', () => {
  it('uses the intrinsic ratio when width and height are known', () => {
    const layout = toGalleryImageLayout({ src: '/media/a.png', alt: 'A', width: 1600, height: 900 })

    // ratio = null → 不写 aspect-ratio，交给图片本身；fit = none → 不加 object-cover
    expect(layout).toEqual({ ratio: null, fit: 'none' })
  })

  it('falls back to a stable box (contain, no crop) when dimensions are missing', () => {
    expect(toGalleryImageLayout({ src: '/media/a.png', alt: 'A' })).toEqual({
      ratio: GALLERY_FALLBACK_RATIO,
      fit: 'contain',
    })
    expect(toGalleryImageLayout({ src: '/media/a.png', alt: 'A', width: 1600 })).toEqual({
      ratio: GALLERY_FALLBACK_RATIO,
      fit: 'contain',
    })
    expect(toGalleryImageLayout({ src: '/media/a.png', alt: 'A', height: 900 })).toEqual({
      ratio: GALLERY_FALLBACK_RATIO,
      fit: 'contain',
    })
  })

  it('treats zero dimensions as missing (never width=0 / height=0 collapse)', () => {
    expect(toGalleryImageLayout({ src: '/media/a.png', alt: 'A', width: 0, height: 0 })).toEqual({
      ratio: GALLERY_FALLBACK_RATIO,
      fit: 'contain',
    })
  })

  it('never requests object-cover for a real gallery image', () => {
    const withSize = toGalleryImageLayout({ src: '/a.png', alt: '', width: 10, height: 10 })
    const withoutSize = toGalleryImageLayout({ src: '/a.png', alt: '' })

    expect(withSize.fit).not.toBe('cover')
    expect(withoutSize.fit).not.toBe('cover')
  })

  it('handles a missing media entry', () => {
    expect(toGalleryImageLayout(null)).toEqual({ ratio: GALLERY_FALLBACK_RATIO, fit: 'contain' })
  })
})

describe('normalizeGalleryCaption', () => {
  it('accepts only non-empty strings', () => {
    expect(normalizeGalleryCaption('Caption')).toBe('Caption')
    expect(normalizeGalleryCaption('')).toBeNull()
    expect(normalizeGalleryCaption('   ')).toBeNull()
    expect(normalizeGalleryCaption(null)).toBeNull()
    expect(normalizeGalleryCaption(undefined)).toBeNull()
  })
})

describe('gallery alt text', () => {
  it('prefers media.alt', () => {
    expect(
      toCoverImage(
        { src: '/media/a.png', alt: 'Dashboard interface', width: 1200, height: 800 },
        { apiBase: API_BASE, altFallback: 'Eson_web' },
      )?.alt,
    ).toBe('Dashboard interface')
  })

  it('falls back to the content title when media.alt is empty', () => {
    expect(
      toCoverImage({ src: '/media/a.png', alt: '', width: 1200, height: 800 }, {
        apiBase: API_BASE,
        altFallback: 'Eson_web',
      })?.alt,
    ).toBe('Eson_web')
  })

  it('never emits undefined / null / generic words when both are missing', () => {
    const image = toCoverImage({ src: '/media/a.png', alt: '', width: 1, height: 1 }, { apiBase: API_BASE })

    expect(image?.alt).toBe('')
    expect(image?.alt).not.toContain('undefined')
  })

  it('resolves the gallery URL against the API origin (never a storage path)', () => {
    const image = toCoverImage({ src: '/media/a.png', alt: 'A', width: 10, height: 10 }, { apiBase: API_BASE })

    expect(image?.src).toBe('http://api.test:3001/media/a.png')
    expect(image?.src).not.toContain('storageKey')
  })
})

describe('cover + gallery co-existence', () => {
  it('keeps the cover reachable while the same media stays in the gallery', () => {
    const shared = { src: '/media/shared.png', alt: 'Shared', width: 1200, height: 800 }
    const rows = toGalleryRows([item({ id: 'shared', media: shared })])

    // gallery 不去重、不影响 cover：同一媒体可以同时存在
    expect(rows).toHaveLength(1)
    expect(rows[0]?.media).toEqual(shared)
    expect(toCoverImage(shared, { apiBase: API_BASE })?.src).toBe('http://api.test:3001/media/shared.png')
  })
})
