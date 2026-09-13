import { describe, expect, it } from 'vitest'
import {
  MAX_MEDIA_UPLOAD_BYTES,
  formatDimensions,
  formatFileSize,
  formatMediaDate,
  mediaDisplayName,
  mediaErrorKey,
  mediaReferenceLines,
  normalizeAltInput,
  readMediaErrorReason,
  readMediaReferences,
  validateMediaFile,
} from '~/utils/media'

// Phase 4-F.4：Admin Media Library 纯函数（错误映射 / 引用计数 / 展示格式化）。

describe('validateMediaFile (客户端预检，不是安全边界)', () => {
  it('rejects a missing file and an empty file', () => {
    expect(validateMediaFile(null)).toEqual({
      ok: false,
      reasonKey: 'admin.media.errors.FILE_MISSING',
    })
    expect(validateMediaFile({ name: 'a.png', type: 'image/png', size: 0 })).toEqual({
      ok: false,
      reasonKey: 'admin.media.errors.FILE_EMPTY',
    })
  })

  it('rejects files above the 10 MB limit', () => {
    expect(
      validateMediaFile({ name: 'a.png', type: 'image/png', size: MAX_MEDIA_UPLOAD_BYTES + 1 }),
    ).toEqual({ ok: false, reasonKey: 'admin.media.errors.FILE_TOO_LARGE' })
  })

  it('rejects unsupported extensions and mime types', () => {
    expect(validateMediaFile({ name: 'clip.gif', type: 'image/gif', size: 1024 })).toEqual({
      ok: false,
      reasonKey: 'admin.media.errors.EXTENSION_NOT_ALLOWED',
    })
    expect(validateMediaFile({ name: 'photo.png', type: 'image/gif', size: 1024 })).toEqual({
      ok: false,
      reasonKey: 'admin.media.errors.MIME_NOT_ALLOWED',
    })
  })

  it('accepts every supported format and the file name is matched case-insensitively', () => {
    for (const [name, type] of [
      ['photo.jpg', 'image/jpeg'],
      ['photo.JPEG', 'image/jpeg'],
      ['photo.png', 'image/png'],
      ['photo.webp', 'image/webp'],
      ['photo.avif', 'image/avif'],
    ] as const) {
      expect(validateMediaFile({ name, type, size: 1024 })).toEqual({ ok: true })
    }
  })
})

describe('media error mapping', () => {
  it('reads the stable reason from a $fetch error envelope and from unwrapped details', () => {
    const envelope = { data: { error: { details: [{ reason: 'MEDIA_IN_USE' }] } } }
    const unwrapped = { details: [{ reason: 'STORAGE_WRITE_FAILED' }] }

    expect(readMediaErrorReason(envelope)).toBe('MEDIA_IN_USE')
    expect(readMediaErrorReason(unwrapped)).toBe('STORAGE_WRITE_FAILED')
  })

  it('ignores unknown or malformed reasons instead of rendering arbitrary i18n keys', () => {
    expect(readMediaErrorReason(undefined)).toBeNull()
    expect(readMediaErrorReason(new Error('boom'))).toBeNull()
    expect(readMediaErrorReason({ data: { error: { details: [{ reason: 'NOT_A_REASON' }] } } })).toBeNull()
    expect(readMediaErrorReason({ data: { error: { details: [] } } })).toBeNull()
  })

  it('maps known reasons to i18n keys and everything else to the generic key', () => {
    expect(mediaErrorKey({ data: { error: { details: [{ reason: 'FILE_TOO_LARGE' }] } } })).toBe(
      'admin.media.errors.FILE_TOO_LARGE',
    )
    expect(mediaErrorKey({ data: { error: { details: [{ reason: 'IMAGE_TOO_LARGE' }] } } })).toBe(
      'admin.media.errors.IMAGE_TOO_LARGE',
    )
    expect(mediaErrorKey(new Error('boom'))).toBe('admin.media.errors.unknown')
  })
})

describe('media references', () => {
  it('only returns non-zero reference counts', () => {
    expect(
      mediaReferenceLines({
        worksCover: 1,
        labsCover: 0,
        writingsCover: 0,
        workMedia: 2,
        labMedia: 0,
        writingMedia: 0,
        total: 3,
      }),
    ).toEqual([
      { key: 'admin.media.references.workCover', count: 1 },
      { key: 'admin.media.references.workGallery', count: 2 },
    ])
  })

  it('reads references from a delete conflict response', () => {
    const conflict = {
      data: {
        error: {
          details: [
            {
              reason: 'MEDIA_IN_USE',
              references: { worksCover: 1, workMedia: 1, total: 2 },
            },
          ],
        },
      },
    }

    expect(readMediaReferences(conflict)).toEqual([
      { key: 'admin.media.references.workCover', count: 1 },
      { key: 'admin.media.references.workGallery', count: 1 },
    ])
    expect(readMediaReferences(new Error('boom'))).toEqual([])
  })
})

describe('display helpers', () => {
  it('formats file size / dimensions / date', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(null)).toBe('—')
    expect(formatDimensions(1920, 1080)).toBe('1920 × 1080')
    expect(formatDimensions(0, 1080)).toBe('—')
    expect(formatMediaDate('2026-06-21T10:00:00.000Z')).toBe('2026-06-21')
    expect(formatMediaDate('not-a-date')).toBe('—')
  })

  it('prefers originalFilename and never renders storageKey / disk paths', () => {
    expect(mediaDisplayName({ filename: 'abc123.webp', originalFilename: 'cover.webp' })).toBe('cover.webp')
    expect(mediaDisplayName({ filename: 'abc123.webp', originalFilename: null })).toBe('abc123.webp')
    expect(mediaDisplayName({})).toBe('—')
  })

  it('normalizes alt input so an empty string clears the metadata', () => {
    expect(normalizeAltInput('  Cover image  ')).toBe('Cover image')
    expect(normalizeAltInput('')).toBeNull()
    expect(normalizeAltInput('   ')).toBeNull()
    expect(normalizeAltInput(null)).toBeNull()
  })
})
