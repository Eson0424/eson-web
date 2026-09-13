import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../common/errors/app-error.js'
import { createStorageDriver, StorageService } from './storage.service.js'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const KEY = `media/2026/09/${UUID}.png`

describe('StorageService (local driver, default)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'eson-storage-'))
    vi.stubEnv('STORAGE_DRIVER', 'local')
    vi.stubEnv('MEDIA_LOCAL_ROOT', root)
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '')
    vi.stubEnv('PORT', '3001')
    vi.stubEnv('S3_ENDPOINT', '')
    vi.stubEnv('S3_BUCKET', '')
    vi.stubEnv('S3_ACCESS_KEY', '')
    vi.stubEnv('S3_SECRET_KEY', '')
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(root, { recursive: true, force: true })
  })

  it('selects the local driver and is writable without any external service', () => {
    const service = new StorageService()

    expect(service.getDriverName()).toBe('local')
    expect(service.isLocal()).toBe(true)
    expect(service.isConfigured()).toBe(true)
    expect(service.unavailableReason()).toBeUndefined()
    expect(service.getLocalRoot()).toBe(path.resolve(root))
  })

  it('writes, reads and deletes real files through the driver', async () => {
    const service = new StorageService()
    const body = Buffer.from('png-bytes')

    const stored = await service.put({ key: KEY, body, contentType: 'image/png' })

    expect(stored).toEqual({ key: KEY, size: body.byteLength, contentType: 'image/png' })
    await expect(readFile(path.join(root, KEY))).resolves.toEqual(body)
    await expect(service.exists(KEY)).resolves.toBe(true)

    await service.delete(KEY)
    await expect(service.exists(KEY)).resolves.toBe(false)
  })

  it('generates keys and public urls from the configured base url', () => {
    const service = new StorageService()

    expect(service.buildObjectKey('image/png', new Date('2026-09-01T00:00:00.000Z'), UUID)).toBe(KEY)
    expect(service.getPublicBaseUrl()).toBe('http://localhost:3001')
    expect(service.buildPublicUrl(KEY)).toBe(`http://localhost:3001/${KEY}`)
  })

  it('strips trailing slashes from MEDIA_PUBLIC_BASE_URL', () => {
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', 'https://cdn.example.com///')

    const service = new StorageService()

    expect(service.buildPublicUrl(KEY)).toBe(`https://cdn.example.com/${KEY}`)
  })

  it('rejects unsafe keys for delete / exists / public url', async () => {
    const service = new StorageService()

    await expect(service.delete('../../etc/passwd')).rejects.toBeInstanceOf(AppError)
    await expect(service.exists('media/2026/09/x.exe')).rejects.toBeInstanceOf(AppError)
    expect(() => service.buildPublicUrl('seed/placeholder-1.webp')).toThrowError(AppError)
  })

  it('keeps the S3 config validation fail-fast and never leaks credentials', () => {
    const service = new StorageService()

    expect(() => service.getConfig()).toThrowError(AppError)

    try {
      service.getConfig()
    } catch (error) {
      expect((error as AppError).status).toBe(503)
      expect((error as AppError).code).toBe('FILE_UPLOAD_ERROR')
    }

    vi.stubEnv('S3_ENDPOINT', 'http://localhost:9000')
    vi.stubEnv('S3_BUCKET', 'eson-web-media')
    vi.stubEnv('S3_ACCESS_KEY', 'local-access-key')
    vi.stubEnv('S3_SECRET_KEY', 'local-secret-key')

    const configured = new StorageService().getConfig()

    expect(configured).toEqual({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'eson-web-media',
      accessKey: 'local-access-key',
      secretKey: 'local-secret-key',
    })
  })
})

describe('createStorageDriver (fail-fast paths)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fails fast on STORAGE_DRIVER=s3 without S3 configuration', async () => {
    vi.stubEnv('STORAGE_DRIVER', 's3')
    vi.stubEnv('S3_ENDPOINT', '')
    vi.stubEnv('S3_BUCKET', '')
    vi.stubEnv('S3_ACCESS_KEY', '')
    vi.stubEnv('S3_SECRET_KEY', '')

    const service = new StorageService()

    expect(service.getDriverName()).toBe('unconfigured')
    expect(service.isConfigured()).toBe(false)
    expect(service.getLocalRoot()).toBeNull()
    expect(service.unavailableReason()).toContain('S3_ENDPOINT')
    await expect(
      service.put({ key: KEY, body: Buffer.from('x'), contentType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'FILE_UPLOAD_ERROR', status: 503 })
  })

  it('fails fast on STORAGE_DRIVER=s3 even when S3 configuration exists (driver not implemented yet)', () => {
    vi.stubEnv('STORAGE_DRIVER', 's3')
    vi.stubEnv('S3_ENDPOINT', 'http://localhost:9000')
    vi.stubEnv('S3_BUCKET', 'eson-web-media')
    vi.stubEnv('S3_ACCESS_KEY', 'key')
    vi.stubEnv('S3_SECRET_KEY', 'secret')

    const service = new StorageService()

    expect(service.isConfigured()).toBe(false)
    expect(service.unavailableReason()).toContain('not implemented')
    expect(() => service.buildPublicUrl(KEY)).not.toThrow()
  })

  it('fails fast on an unknown driver instead of silently falling back', async () => {
    vi.stubEnv('STORAGE_DRIVER', 'ftp')

    const service = new StorageService()

    expect(service.getDriverName()).toBe('unconfigured')
    expect(service.unavailableReason()).toContain('Unknown STORAGE_DRIVER')
    await expect(service.exists(KEY)).rejects.toMatchObject({ status: 503 })
  })

  it('returns the local driver for the default configuration', () => {
    vi.stubEnv('STORAGE_DRIVER', '')

    expect(createStorageDriver().name).toBe('local')
  })
})
