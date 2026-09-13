import { describe, expect, it } from 'vitest'
import {
  BMP_BYTES,
  GIF_BYTES,
  PDF_BYTES,
  REAL_PNG_1X1,
  SVG_TEXT,
  TIFF_BYTES,
  avifImage,
  avifWithoutDimensions,
  jpegImage,
  jpegWithoutDimensions,
  pngImage,
  pngWithDimensions,
  randomBytes,
  webpExtendedImage,
  webpImage,
} from '../../../test/fixtures/image-fixtures.js'
import {
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  detectImageMimeType,
  inspectImage,
  readImageDimensions,
} from './image-inspection.js'

describe('image limits', () => {
  it('matches the approved upload limits (10MB / 40MP)', () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024)
    expect(MAX_IMAGE_PIXELS).toBe(40_000_000)
  })
})

describe('detectImageMimeType (magic bytes)', () => {
  it('detects the four allowed image formats', () => {
    expect(detectImageMimeType(REAL_PNG_1X1)).toBe('image/png')
    expect(detectImageMimeType(jpegImage(10, 10))).toBe('image/jpeg')
    expect(detectImageMimeType(webpImage(10, 10))).toBe('image/webp')
    expect(detectImageMimeType(webpExtendedImage(10, 10))).toBe('image/webp')
    expect(detectImageMimeType(avifImage(10, 10))).toBe('image/avif')
  })

  it('rejects non-image and disallowed image formats', () => {
    expect(detectImageMimeType(randomBytes(64))).toBeNull()
    expect(detectImageMimeType(SVG_TEXT)).toBeNull()
    expect(detectImageMimeType(GIF_BYTES)).toBeNull()
    expect(detectImageMimeType(TIFF_BYTES)).toBeNull()
    expect(detectImageMimeType(BMP_BYTES)).toBeNull()
    expect(detectImageMimeType(PDF_BYTES)).toBeNull()
  })

  it('requires an avif/avis brand for ISO-BMFF files', () => {
    expect(detectImageMimeType(avifImage(10, 10, ['avif']))).toBe('image/avif')
    expect(detectImageMimeType(avifImage(10, 10, ['mif1', 'avif']))).toBe('image/avif')
    expect(detectImageMimeType(avifImage(10, 10, ['avis']))).toBe('image/avif')
    // 以 ftyp 开头但不是 AVIF：HEIC / MP4 / 只有 mif1
    expect(detectImageMimeType(avifImage(10, 10, ['heic']))).toBeNull()
    expect(detectImageMimeType(avifImage(10, 10, ['mif1']))).toBeNull()
    expect(detectImageMimeType(avifImage(10, 10, ['isom', 'mp41']))).toBeNull()
  })

  it('rejects buffers that are too short or not buffers', () => {
    expect(detectImageMimeType(Buffer.from([0x89, 0x50]))).toBeNull()
    expect(detectImageMimeType(Buffer.alloc(0))).toBeNull()
    expect(detectImageMimeType(undefined)).toBeNull()
    expect(detectImageMimeType(null)).toBeNull()
  })

  it('does not trust a signature placed after unrelated bytes', () => {
    const prefixed = Buffer.concat([Buffer.from('GARBAGE!'), REAL_PNG_1X1])

    expect(detectImageMimeType(prefixed)).toBeNull()
  })
})

describe('readImageDimensions', () => {
  it('reads PNG dimensions from IHDR', () => {
    expect(readImageDimensions(REAL_PNG_1X1, 'image/png')).toEqual({ width: 1, height: 1 })
    expect(readImageDimensions(pngWithDimensions(1600, 900), 'image/png')).toEqual({
      width: 1600,
      height: 900,
    })
    expect(readImageDimensions(pngImage(8000, 5000), 'image/png')).toEqual({
      width: 8000,
      height: 5000,
    })
  })

  it('reads JPEG dimensions from SOFn', () => {
    expect(readImageDimensions(jpegImage(4000, 3000), 'image/jpeg')).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it('reads WebP dimensions for VP8 / VP8X containers', () => {
    expect(readImageDimensions(webpImage(800, 600), 'image/webp')).toEqual({ width: 800, height: 600 })
    expect(readImageDimensions(webpExtendedImage(1024, 768), 'image/webp')).toEqual({
      width: 1024,
      height: 768,
    })
  })

  it('reads AVIF dimensions from ipco/ispe', () => {
    expect(readImageDimensions(avifImage(2000, 1000), 'image/avif')).toEqual({
      width: 2000,
      height: 1000,
    })
  })

  it('returns null for malformed or truncated images instead of guessing', () => {
    expect(readImageDimensions(REAL_PNG_1X1.subarray(0, 20), 'image/png')).toBeNull()
    expect(readImageDimensions(jpegWithoutDimensions(), 'image/jpeg')).toBeNull()
    expect(readImageDimensions(avifWithoutDimensions(), 'image/avif')).toBeNull()
    expect(readImageDimensions(randomBytes(64), 'image/png')).toBeNull()

    const brokenWebp = Buffer.from(webpImage(10, 10))

    brokenWebp.write('JUNK', 12, 'ascii')
    expect(readImageDimensions(brokenWebp, 'image/webp')).toBeNull()
  })

  it('rejects zero dimensions', () => {
    expect(readImageDimensions(pngImage(0, 100), 'image/png')).toBeNull()
    expect(readImageDimensions(pngImage(100, 0), 'image/png')).toBeNull()
  })
})

describe('inspectImage', () => {
  it('returns mime type and dimensions for valid images', () => {
    expect(inspectImage(pngWithDimensions(64, 32))).toEqual({
      mimeType: 'image/png',
      width: 64,
      height: 32,
    })
  })

  it('returns null when type or dimensions cannot be determined', () => {
    expect(inspectImage(randomBytes(32))).toBeNull()
    expect(inspectImage(jpegWithoutDimensions())).toBeNull()
  })
})
