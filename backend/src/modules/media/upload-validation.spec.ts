import { describe, expect, it } from 'vitest'
import {
  REAL_PNG_1X1,
  avifImage,
  jpegImage,
  jpegWithoutDimensions,
  padTo,
  pngImage,
  pngWithDimensions,
  randomBytes,
  webpImage,
} from '../../../test/fixtures/image-fixtures.js'
import { MAX_UPLOAD_BYTES } from './image-inspection.js'
import { sanitizeFilename, validateAltText, validateUploadCandidate } from './upload-validation.js'

function expectReason(candidate: Parameters<typeof validateUploadCandidate>[0], reason: string) {
  try {
    validateUploadCandidate(candidate)
    throw new Error(`expected validation to fail with ${reason}`)
  } catch (error) {
    expect((error as { details?: Array<{ reason?: string }> }).details?.[0]?.reason).toBe(reason)
  }
}

describe('validateUploadCandidate — accepted formats', () => {
  it('accepts valid JPEG / PNG / WebP / AVIF uploads', () => {
    expect(
      validateUploadCandidate({
        buffer: jpegImage(4000, 3000),
        declaredMimeType: 'image/jpeg',
        originalFilename: 'photo.jpg',
      }),
    ).toMatchObject({ mimeType: 'image/jpeg', width: 4000, height: 3000, filename: 'photo.jpg' })

    expect(
      validateUploadCandidate({
        buffer: pngWithDimensions(1600, 900),
        declaredMimeType: 'image/png',
        originalFilename: 'cover.png',
      }),
    ).toMatchObject({ mimeType: 'image/png', width: 1600, height: 900 })

    expect(
      validateUploadCandidate({
        buffer: webpImage(800, 600),
        declaredMimeType: 'image/webp',
        originalFilename: 'shot.webp',
      }),
    ).toMatchObject({ mimeType: 'image/webp', width: 800, height: 600 })

    expect(
      validateUploadCandidate({
        buffer: avifImage(2000, 1000),
        declaredMimeType: 'image/avif',
        originalFilename: 'hero.avif',
      }),
    ).toMatchObject({ mimeType: 'image/avif', width: 2000, height: 1000 })
  })

  it('accepts a file without an original filename (metadata is optional)', () => {
    const validated = validateUploadCandidate({
      buffer: REAL_PNG_1X1,
      declaredMimeType: 'image/png',
    })

    expect(validated.filename).toBeNull()
    expect(validated.originalFilename).toBeNull()
    expect(validated.size).toBe(REAL_PNG_1X1.byteLength)
  })

  it('normalises alt text', () => {
    expect(
      validateUploadCandidate({
        buffer: REAL_PNG_1X1,
        declaredMimeType: 'image/png',
        alt: '  封面图  ',
      }).alt,
    ).toBe('封面图')

    expect(
      validateUploadCandidate({ buffer: REAL_PNG_1X1, declaredMimeType: 'image/png', alt: '   ' }).alt,
    ).toBeNull()
  })
})

describe('validateUploadCandidate — file presence and size', () => {
  it('rejects a missing file', () => {
    expectReason({ declaredMimeType: 'image/png' }, 'FILE_MISSING')
    expectReason({ buffer: null, declaredMimeType: 'image/png' }, 'FILE_MISSING')
  })

  it('rejects an empty file', () => {
    expectReason({ buffer: Buffer.alloc(0), declaredMimeType: 'image/png' }, 'FILE_EMPTY')
  })

  it('accepts exactly 10MB and rejects anything larger', () => {
    const atLimit = padTo(pngWithDimensions(100, 100), MAX_UPLOAD_BYTES)

    expect(atLimit.byteLength).toBe(MAX_UPLOAD_BYTES)
    expect(
      validateUploadCandidate({
        buffer: atLimit,
        declaredMimeType: 'image/png',
        originalFilename: 'big.png',
      }).size,
    ).toBe(MAX_UPLOAD_BYTES)

    expectReason(
      { buffer: padTo(pngWithDimensions(100, 100), MAX_UPLOAD_BYTES + 1), declaredMimeType: 'image/png' },
      'FILE_TOO_LARGE',
    )
  })
})

describe('validateUploadCandidate — mime / extension / signature consistency', () => {
  it('rejects MIME types outside the whitelist', () => {
    for (const declaredMimeType of [
      'image/gif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'video/mp4',
      'audio/mpeg',
      'application/octet-stream',
      '',
    ]) {
      expectReason({ buffer: REAL_PNG_1X1, declaredMimeType }, 'MIME_NOT_ALLOWED')
    }
  })

  it('rejects unsupported extensions even when the content looks like an image', () => {
    for (const originalFilename of ['image.svg', 'image.gif', 'payload.php', 'payload.exe', 'noextension']) {
      expectReason(
        { buffer: REAL_PNG_1X1, declaredMimeType: 'image/png', originalFilename },
        'EXTENSION_NOT_ALLOWED',
      )
    }
  })

  it('rejects spoofed extensions (content wins over filename)', () => {
    expectReason(
      { buffer: REAL_PNG_1X1, declaredMimeType: 'image/png', originalFilename: 'photo.jpg' },
      'EXTENSION_MISMATCH',
    )
  })

  it('rejects a fake JPG that actually contains a PNG (and vice versa)', () => {
    expectReason(
      { buffer: pngWithDimensions(10, 10), declaredMimeType: 'image/jpeg', originalFilename: 'fake.jpg' },
      'MIME_MISMATCH',
    )

    expectReason(
      { buffer: jpegImage(10, 10), declaredMimeType: 'image/png', originalFilename: 'fake.png' },
      'MIME_MISMATCH',
    )
  })

  it('rejects files whose magic bytes match no allowed format', () => {
    expectReason(
      { buffer: randomBytes(128), declaredMimeType: 'image/png', originalFilename: 'random.png' },
      'SIGNATURE_MISMATCH',
    )
    expectReason(
      { buffer: Buffer.from('GIF89a', 'binary'), declaredMimeType: 'image/png', originalFilename: 'a.png' },
      'SIGNATURE_MISMATCH',
    )
  })

  it('never uses the client filename (client cannot influence the object key)', () => {
    const validated = validateUploadCandidate({
      buffer: REAL_PNG_1X1,
      declaredMimeType: 'image/png',
      originalFilename: '../../etc/passwd.png',
    })

    expect(validated.filename).toBe('etc-passwd.png')
    expect(validated.filename).not.toContain('/')
    expect(validated.filename).not.toContain('\\')
    expect(validated.filename).not.toContain('..')
    expect(validated.mimeType).toBe('image/png')
  })
})

describe('validateUploadCandidate — dimensions / 40MP', () => {
  it('accepts exactly 40MP', () => {
    expect(
      validateUploadCandidate({
        buffer: pngWithDimensions(8000, 5000),
        declaredMimeType: 'image/png',
        originalFilename: 'limit.png',
      }),
    ).toMatchObject({ width: 8000, height: 5000 })
  })

  it('rejects images above 40MP', () => {
    expectReason(
      { buffer: pngWithDimensions(10000, 4001), declaredMimeType: 'image/png', originalFilename: 'huge.png' },
      'IMAGE_TOO_LARGE',
    )
  })

  it('rejects images whose dimensions cannot be read', () => {
    expectReason(
      { buffer: jpegWithoutDimensions(), declaredMimeType: 'image/jpeg', originalFilename: 'broken.jpg' },
      'DIMENSIONS_UNREADABLE',
    )
    expectReason(
      { buffer: pngImage(1, 1).subarray(0, 20), declaredMimeType: 'image/png', originalFilename: 'cut.png' },
      'DIMENSIONS_UNREADABLE',
    )
  })
})

describe('sanitizeFilename', () => {
  it('strips path separators, control characters and leading dots', () => {
    expect(sanitizeFilename('../../etc/passwd.png')).toBe('etc-passwd.png')
    expect(sanitizeFilename('C:\\windows\\evil.png')).toBe('C:-windows-evil.png')
    expect(sanitizeFilename('..hidden.png')).toBe('hidden.png')
    expect(sanitizeFilename('with\u0000null.png')).toBe('withnull.png')
    expect(sanitizeFilename('line\nbreak.png')).toBe('linebreak.png')
  })

  it('keeps unicode names and limits length', () => {
    expect(sanitizeFilename('封面 图.png')).toBe('封面 图.png')
    expect(sanitizeFilename('a'.repeat(400))?.length).toBe(255)
  })

  it('returns null for unusable input', () => {
    expect(sanitizeFilename(undefined)).toBeNull()
    expect(sanitizeFilename(null)).toBeNull()
    expect(sanitizeFilename('   ')).toBeNull()
    expect(sanitizeFilename('....')).toBeNull()
  })
})

describe('validateAltText', () => {
  it('rejects alt text above 500 characters with VALIDATION_ERROR', () => {
    expect(validateAltText('a'.repeat(500))).toHaveLength(500)

    try {
      validateAltText('a'.repeat(501))
      throw new Error('expected alt validation to fail')
    } catch (error) {
      expect((error as { code?: string }).code).toBe('VALIDATION_ERROR')
      expect((error as { status?: number }).status).toBe(400)
    }
  })
})
