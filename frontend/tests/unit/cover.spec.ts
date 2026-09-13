import { describe, expect, it } from 'vitest'
import { resolveMediaUrl, toCoverImage } from '~/utils/cover'
import { toMediaRef } from '~/services/work.service'

// Phase 4-F.5.1：Public Cover 的数据层（API cover → 可渲染视图模型）。
// 组件只负责把这里的结果画出来，因此边界都在这一层验证。

const API_BASE = 'http://api.test:3001/api/v1'

describe('resolveMediaUrl', () => {
  it('keeps absolute media URLs unchanged (uploaded media)', () => {
    expect(resolveMediaUrl('http://api.test:3001/media/2026/09/a.png', API_BASE)).toBe(
      'http://api.test:3001/media/2026/09/a.png',
    )
    expect(resolveMediaUrl('https://cdn.example.com/a.webp', API_BASE)).toBe(
      'https://cdn.example.com/a.webp',
    )
    expect(resolveMediaUrl('//cdn.example.com/a.webp', API_BASE)).toBe('//cdn.example.com/a.webp')
  })

  it('resolves root-relative URLs against the API origin, not the frontend origin', () => {
    expect(resolveMediaUrl('/media/seed/placeholder-1.webp', API_BASE)).toBe(
      'http://api.test:3001/media/seed/placeholder-1.webp',
    )
  })

  it('returns null for empty / missing values', () => {
    expect(resolveMediaUrl(null, API_BASE)).toBeNull()
    expect(resolveMediaUrl(undefined, API_BASE)).toBeNull()
    expect(resolveMediaUrl('', API_BASE)).toBeNull()
    expect(resolveMediaUrl('   ', API_BASE)).toBeNull()
  })

  it('falls back to the raw value when no API base is configured', () => {
    expect(resolveMediaUrl('/media/a.webp', '')).toBe('/media/a.webp')
    expect(resolveMediaUrl('media/a.webp', API_BASE)).toBe('media/a.webp')
  })
})

describe('toCoverImage', () => {
  it('returns null when there is no cover or no usable URL', () => {
    expect(toCoverImage(null, { apiBase: API_BASE })).toBeNull()
    expect(toCoverImage(undefined, { apiBase: API_BASE })).toBeNull()
    expect(toCoverImage({ src: '', alt: '' }, { apiBase: API_BASE })).toBeNull()
    expect(toCoverImage({ src: '   ', alt: '' }, { apiBase: API_BASE })).toBeNull()
  })

  it('resolves the src and carries the intrinsic size (no CLS)', () => {
    expect(
      toCoverImage(
        { src: '/media/seed/a.webp', alt: 'A', width: 1600, height: 900 },
        { apiBase: API_BASE, altFallback: 'Work title' },
      ),
    ).toEqual({
      src: 'http://api.test:3001/media/seed/a.webp',
      alt: 'A',
      width: 1600,
      height: 900,
    })
  })

  it('falls back to the content title when media.alt is empty', () => {
    expect(
      toCoverImage({ src: '/media/a.webp', alt: '' }, { apiBase: API_BASE, altFallback: 'Eson_web' }),
    ).toEqual({ src: 'http://api.test:3001/media/a.webp', alt: 'Eson_web' })

    expect(
      toCoverImage({ src: '/media/a.webp', alt: '   ' }, { apiBase: API_BASE, altFallback: ' Eson_web ' }),
    ).toEqual({ src: 'http://api.test:3001/media/a.webp', alt: 'Eson_web' })
  })

  it('never emits undefined into the alt attribute', () => {
    expect(
      toCoverImage({ src: '/media/a.webp', alt: null as unknown as string }, { apiBase: API_BASE }),
    ).toEqual({ src: 'http://api.test:3001/media/a.webp', alt: '' })
  })

  it('drops invalid intrinsic dimensions instead of emitting them', () => {
    expect(
      toCoverImage(
        { src: '/media/a.webp', alt: 'A', width: 0, height: -12 },
        { apiBase: API_BASE },
      ),
    ).toEqual({ src: 'http://api.test:3001/media/a.webp', alt: 'A' })
  })
})

describe('public content mapper (toMediaRef)', () => {
  it('maps the API cover into the view model used by PublicCover', () => {
    expect(
      toMediaRef({ url: '/media/seed/a.webp', alt: 'Placeholder', width: 1600, height: 900 }),
    ).toEqual({ src: '/media/seed/a.webp', alt: 'Placeholder', width: 1600, height: 900 })
  })

  it('returns undefined when the API omits the cover (null in DB)', () => {
    expect(toMediaRef(undefined)).toBeUndefined()
  })

  it('never lets a missing alt become undefined', () => {
    expect(toMediaRef({ url: '/media/a.webp', alt: undefined as unknown as string })).toEqual({
      src: '/media/a.webp',
      alt: '',
      width: undefined,
      height: undefined,
    })
  })
})
