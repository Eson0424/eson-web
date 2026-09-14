/**
 * 备份保留策略测试（Phase 5-G）
 *
 * 使用 Node 内置 test runner（无新增依赖）：
 *   node --test docker/backup/retention.spec.mjs
 *
 * 覆盖：文件名解析、ISO 周键、daily/weekly/monthly 分桶、附属文件跟随、
 *       未识别文件保护、未来时间戳保护、dry-run 与 --apply 行为。
 */

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'

import { isoWeekKey, parseBackupName, planRetention, stripSidecar } from './retention.mjs'

const execFileAsync = promisify(execFile)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.join(HERE, 'retention.mjs')

const NOW = new Date('2026-09-14T12:00:00Z')

test('stripSidecar 去掉附属后缀', () => {
  assert.equal(stripSidecar('eson_web_db_20260914_020000.dump.sha256'), 'eson_web_db_20260914_020000.dump')
  assert.equal(
    stripSidecar('eson_web_media_20260914_020000.tar.gz.manifest.sha256'),
    'eson_web_media_20260914_020000.tar.gz',
  )
  assert.equal(stripSidecar('eson_web_db_20260914_020000.dump.meta.json'), 'eson_web_db_20260914_020000.dump')
  assert.equal(stripSidecar('eson_web_db_20260914_020000.dump'), 'eson_web_db_20260914_020000.dump')
})

test('parseBackupName 解析合法名称', () => {
  const parsed = parseBackupName('eson_web_db_20260914_020000.dump')

  assert.ok(parsed)
  assert.equal(parsed.prefix, 'eson_web_db_')
  assert.equal(parsed.ext, 'dump')
  assert.equal(parsed.dateKey, '20260914')
  assert.equal(parsed.monthKey, '202609')
  assert.equal(parsed.timestamp, Date.UTC(2026, 8, 14, 2, 0, 0))
})

test('parseBackupName 拒绝非法名称与不存在的日期', () => {
  assert.equal(parseBackupName('eson_web_db_20260914_020000'), null)
  assert.equal(parseBackupName('backup.dump'), null)
  assert.equal(parseBackupName('eson_web_db_20260231_020000.dump'), null)
  assert.equal(parseBackupName('eson_web_db_20261301_020000.dump'), null)
  assert.equal(parseBackupName('eson_web_db_20260914_250000.dump'), null)
})

test('isoWeekKey 使用 ISO 周（跨年边界）', () => {
  assert.equal(isoWeekKey(new Date('2026-01-01T00:00:00Z')), '2026-W01')
  assert.equal(isoWeekKey(new Date('2025-12-29T00:00:00Z')), '2026-W01')
  assert.equal(isoWeekKey(new Date('2026-09-14T00:00:00Z')), '2026-W38')
})

test('planRetention 永远保留每个前缀最新的一份', () => {
  const plan = planRetention(
    ['eson_web_db_20260914_020000.dump', 'eson_web_db_20260801_020000.dump'],
    { now: NOW, daily: 0, weekly: 0, monthly: 0 },
  )

  assert.deepEqual(plan.keep, ['eson_web_db_20260914_020000.dump'])
  assert.deepEqual(plan.delete, ['eson_web_db_20260801_020000.dump'])
})

test('planRetention daily 保留最近 N 天各自最新', () => {
  const plan = planRetention(
    [
      'eson_web_db_20260914_020000.dump',
      'eson_web_db_20260914_010000.dump',
      'eson_web_db_20260913_020000.dump',
      'eson_web_db_20260901_020000.dump',
    ],
    { now: NOW, daily: 2, weekly: 0, monthly: 0 },
  )

  assert.deepEqual(plan.keep, ['eson_web_db_20260913_020000.dump', 'eson_web_db_20260914_020000.dump'])
  assert.deepEqual(plan.delete, ['eson_web_db_20260901_020000.dump', 'eson_web_db_20260914_010000.dump'])
})

test('planRetention weekly 保留最近 N 周各自最新', () => {
  const plan = planRetention(
    [
      'eson_web_db_20260914_020000.dump',
      'eson_web_db_20260909_020000.dump',
      'eson_web_db_20260831_020000.dump',
      'eson_web_db_20260810_020000.dump',
    ],
    { now: NOW, daily: 0, weekly: 2, monthly: 0 },
  )

  assert.deepEqual(plan.keep, ['eson_web_db_20260909_020000.dump', 'eson_web_db_20260914_020000.dump'])
  assert.deepEqual(plan.delete, ['eson_web_db_20260810_020000.dump', 'eson_web_db_20260831_020000.dump'])
})

test('planRetention monthly 保留最近 N 月各自最新', () => {
  const plan = planRetention(
    [
      'eson_web_db_20260914_020000.dump',
      'eson_web_db_20260901_020000.dump',
      'eson_web_db_20260815_020000.dump',
      'eson_web_db_20260715_020000.dump',
      'eson_web_db_20260615_020000.dump',
    ],
    { now: NOW, daily: 0, weekly: 0, monthly: 2 },
  )

  assert.deepEqual(plan.keep, ['eson_web_db_20260815_020000.dump', 'eson_web_db_20260914_020000.dump'])
  assert.deepEqual(plan.delete, [
    'eson_web_db_20260615_020000.dump',
    'eson_web_db_20260715_020000.dump',
    'eson_web_db_20260901_020000.dump',
  ])
})

test('planRetention 按前缀分别保留（数据库与媒体互不影响）', () => {
  const plan = planRetention(
    [
      'eson_web_db_20260914_020000.dump',
      'eson_web_media_20260101_020000.tar.gz',
      'eson_web_db_20260101_020000.dump',
    ],
    { now: NOW, daily: 0, weekly: 0, monthly: 0 },
  )

  assert.deepEqual(plan.keep, ['eson_web_db_20260914_020000.dump', 'eson_web_media_20260101_020000.tar.gz'])
  assert.deepEqual(plan.delete, ['eson_web_db_20260101_020000.dump'])
})

test('planRetention 附属文件跟随主文件', () => {
  const plan = planRetention(
    [
      'eson_web_media_20260914_020000.tar.gz',
      'eson_web_media_20260914_020000.tar.gz.sha256',
      'eson_web_media_20260914_020000.tar.gz.manifest.sha256',
      'eson_web_media_20260914_020000.tar.gz.meta.json',
      'eson_web_media_20260101_020000.tar.gz',
      'eson_web_media_20260101_020000.tar.gz.sha256',
    ],
    { now: NOW, daily: 1, weekly: 0, monthly: 0 },
  )

  assert.deepEqual(plan.keep, [
    'eson_web_media_20260914_020000.tar.gz',
    'eson_web_media_20260914_020000.tar.gz.manifest.sha256',
    'eson_web_media_20260914_020000.tar.gz.meta.json',
    'eson_web_media_20260914_020000.tar.gz.sha256',
  ])
  assert.deepEqual(plan.delete, [
    'eson_web_media_20260101_020000.tar.gz',
    'eson_web_media_20260101_020000.tar.gz.sha256',
  ])
})

test('planRetention 保留未识别文件名与未来时间戳', () => {
  const plan = planRetention(
    [
      'README.md',
      'eson_web_db_20260914_020000.dump',
      'eson_web_db_20990101_000000.dump',
      'eson_web_db_20260101_020000.dump',
    ],
    { now: NOW, daily: 1, weekly: 0, monthly: 0 },
  )

  assert.deepEqual(plan.unmanaged, ['README.md'])
  assert.ok(plan.keep.includes('README.md'))
  assert.ok(plan.keep.includes('eson_web_db_20990101_000000.dump'))
  assert.ok(plan.keep.includes('eson_web_db_20260914_020000.dump'))
  assert.deepEqual(plan.delete, ['eson_web_db_20260101_020000.dump'])
})

test('planRetention 空输入返回空计划', () => {
  assert.deepEqual(planRetention([], { now: NOW }), { keep: [], delete: [], unmanaged: [] })
})

test('CLI 默认 dry-run 不删除任何文件', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'eson-retention-'))

  try {
    await mkdir(path.join(root, 'db'))
    await writeFile(path.join(root, 'db', 'eson_web_db_20250601_020000.dump'), 'new')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250101_020000.dump'), 'old')

    const { stdout } = await execFileAsync('node', [CLI, '--dir', root, '--daily', '1', '--weekly', '0', '--monthly', '0'])

    assert.match(stdout, /dry-run/)
    assert.match(stdout, /would delete/)
    assert.deepEqual((await readdir(path.join(root, 'db'))).sort(), [
      'eson_web_db_20250101_020000.dump',
      'eson_web_db_20250601_020000.dump',
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CLI --dry-run 是显式且安全（等同默认，不删除）', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'eson-retention-'))

  try {
    await mkdir(path.join(root, 'db'))
    await writeFile(path.join(root, 'db', 'eson_web_db_20250601_020000.dump'), 'new')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250101_020000.dump'), 'old')

    const { stdout } = await execFileAsync('node', [
      CLI,
      '--dir',
      root,
      '--daily',
      '1',
      '--weekly',
      '0',
      '--monthly',
      '0',
      '--dry-run',
    ])

    assert.match(stdout, /would delete: db\/eson_web_db_20250101_020000.dump/)
    assert.equal((await readdir(path.join(root, 'db'))).length, 2)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CLI --apply 只删除计划内文件（含跨 db/media 目录）', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'eson-retention-'))

  try {
    await mkdir(path.join(root, 'db'))
    await mkdir(path.join(root, 'media'))
    await writeFile(path.join(root, 'db', 'eson_web_db_20250601_020000.dump'), 'new')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250601_020000.dump.sha256'), 'checksum')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250101_020000.dump'), 'old')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250101_020000.dump.sha256'), 'checksum')
    await writeFile(path.join(root, 'media', 'eson_web_media_20250601_020000.tar.gz'), 'new')
    await writeFile(path.join(root, 'media', 'eson_web_media_20241201_020000.tar.gz'), 'old')

    await execFileAsync('node', [CLI, '--dir', root, '--daily', '1', '--weekly', '0', '--monthly', '0', '--apply'])

    assert.deepEqual((await readdir(path.join(root, 'db'))).sort(), [
      'eson_web_db_20250601_020000.dump',
      'eson_web_db_20250601_020000.dump.sha256',
    ])
    assert.deepEqual((await readdir(path.join(root, 'media'))).sort(), [
      'eson_web_media_20250601_020000.tar.gz',
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CLI --max-delete 超限时拒绝删除（exit 1）', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'eson-retention-'))

  try {
    await mkdir(path.join(root, 'db'))
    await writeFile(path.join(root, 'db', 'eson_web_db_20250601_020000.dump'), 'new')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250201_020000.dump'), 'old')
    await writeFile(path.join(root, 'db', 'eson_web_db_20250101_020000.dump'), 'old')

    await assert.rejects(
      execFileAsync('node', [
        CLI,
        '--dir',
        root,
        '--daily',
        '1',
        '--weekly',
        '0',
        '--monthly',
        '0',
        '--max-delete',
        '1',
        '--apply',
      ]),
    )

    assert.equal((await readdir(path.join(root, 'db'))).length, 3)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CLI 备份目录不存在时 exit 1', async () => {
  await assert.rejects(execFileAsync('node', [CLI, '--dir', path.join(tmpdir(), 'eson-missing-dir')]))
})
