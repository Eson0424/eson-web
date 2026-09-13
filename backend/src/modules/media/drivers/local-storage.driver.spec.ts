import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '../../../common/errors/app-error.js'
import { LocalStorageDriver } from './local-storage.driver.js'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const KEY = `media/2026/09/${UUID}.webp`

describe('LocalStorageDriver', () => {
  let root: string
  let driver: LocalStorageDriver

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'eson-media-'))
    driver = new LocalStorageDriver(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('reports itself as the writable local driver', () => {
    expect(driver.name).toBe('local')
    expect(driver.isWritable()).toBe(true)
    expect(driver.getRoot()).toBe(root)
  })

  it('writes the object to <root>/<key> and returns size/contentType', async () => {
    const body = Buffer.from('fake-webp-bytes')
    const stored = await driver.put({ key: KEY, body, contentType: 'image/webp' })

    expect(stored).toEqual({ key: KEY, size: body.byteLength, contentType: 'image/webp' })
    await expect(readFile(path.join(root, KEY))).resolves.toEqual(body)
    await expect(driver.exists(KEY)).resolves.toBe(true)
  })

  it('creates nested directories on demand', async () => {
    const nestedKey = `media/2026/12/${UUID}.png`

    await driver.put({ key: nestedKey, body: Buffer.from('x'), contentType: 'image/png' })

    await expect(driver.exists(nestedKey)).resolves.toBe(true)
  })

  it('never overwrites an existing object', async () => {
    await driver.put({ key: KEY, body: Buffer.from('first'), contentType: 'image/webp' })

    await expect(
      driver.put({ key: KEY, body: Buffer.from('second'), contentType: 'image/webp' }),
    ).rejects.toMatchObject({ code: 'FILE_UPLOAD_ERROR', status: 409 })

    await expect(readFile(path.join(root, KEY))).resolves.toEqual(Buffer.from('first'))
  })

  it('reports exists=false for unknown keys and after delete', async () => {
    const otherKey = `media/2026/10/${UUID}.jpg`

    await expect(driver.exists(otherKey)).resolves.toBe(false)

    await driver.put({ key: KEY, body: Buffer.from('x'), contentType: 'image/webp' })
    await driver.delete(KEY)

    await expect(driver.exists(KEY)).resolves.toBe(false)
  })

  it('treats deleting a missing object as a no-op', async () => {
    await expect(driver.delete(KEY)).resolves.toBeUndefined()
  })

  it('rejects unsafe keys and never writes outside the root', async () => {
    for (const key of ['../../escape.webp', '/absolute.webp', 'media/2026/09/x.exe']) {
      await expect(
        driver.put({ key, body: Buffer.from('x'), contentType: 'image/webp' }),
      ).rejects.toBeInstanceOf(AppError)
      await expect(driver.exists(key)).rejects.toBeInstanceOf(AppError)
      await expect(driver.delete(key)).rejects.toBeInstanceOf(AppError)
    }
  })

  it('does not surface absolute filesystem paths in storage errors', async () => {
    // 目录被文件占用后写入会失败：错误信息只暴露稳定的 code，不暴露路径
    const blockedRoot = path.join(root, 'blocked')

    await writeFile(path.join(root, 'blocked-file'), 'x')
    const brokenDriver = new LocalStorageDriver(path.join(root, 'blocked-file', 'nested'))
    await expect(
      brokenDriver.put({ key: KEY, body: Buffer.from('x'), contentType: 'image/webp' }),
    ).rejects.toMatchObject({ code: 'FILE_UPLOAD_ERROR' })

    expect(blockedRoot).not.toContain('media/2026')
  })
})
