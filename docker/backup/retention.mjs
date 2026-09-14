#!/usr/bin/env node
/**
 * Eson_web 备份保留策略（Phase 5-G）
 *
 * 策略（V1）——按前缀（数据库 / 媒体）分别计算：
 *   Daily    保留最近 N 个不同 UTC 日期各自最新的备份（默认 7）
 *   Weekly   保留最近 N 个不同 ISO 周各自最新的备份（默认 4）
 *   Monthly  保留最近 N 个不同 UTC 月各自最新的备份（默认 3）
 *   兜底     每个前缀最新的一份始终保留；未来时间戳（时钟漂移）一律保留；
 *            无法识别的文件名一律保留（不猜测、不删除）
 *
 * 备份文件命名：<prefix><YYYYMMDD>_<HHMMSS>.<ext>
 * 附属文件（.sha256 / .manifest.sha256 / .meta.json）跟随其主文件一起保留或删除。
 *
 * 默认 dry-run：只有显式 --apply 才会真正删除文件。
 */

import { readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** 备份附属文件后缀（跟随主文件生命周期） */
export const SIDECAR_SUFFIXES = ['.manifest.sha256', '.sha256', '.meta.json']

const BACKUP_NAME_PATTERN =
  /^(?<prefix>[a-z0-9][a-z0-9_-]*_)(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})_(?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})\.(?<ext>[a-z0-9][a-z0-9.]*)$/i

/** 去掉附属后缀，得到主备份文件名 */
export function stripSidecar(fileName) {
  for (const suffix of SIDECAR_SUFFIXES) {
    if (fileName.endsWith(suffix)) {
      return fileName.slice(0, -suffix.length)
    }
  }

  return fileName
}

/** ISO-8601 周键（YYYY-Www），用于周维度保留 */
export function isoWeekKey(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNumber = (target.getUTCDay() + 6) % 7

  target.setUTCDate(target.getUTCDate() - dayNumber + 3)

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7

  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3)

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000))

  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * 解析备份文件名。
 * @returns {{ fileName: string, prefix: string, ext: string, timestamp: number, dateKey: string, weekKey: string, monthKey: string } | null}
 */
export function parseBackupName(fileName) {
  const match = BACKUP_NAME_PATTERN.exec(fileName)

  if (!match?.groups) {
    return null
  }

  const { prefix, year, month, day, hour, minute, second, ext } = match.groups
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
  const date = new Date(timestamp)

  // 拒绝不存在的日期（例如 20260231 / 20261301）
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour) ||
    date.getUTCMinutes() !== Number(minute) ||
    date.getUTCSeconds() !== Number(second)
  ) {
    return null
  }

  return {
    fileName,
    prefix,
    ext,
    timestamp,
    dateKey: `${year}${month}${day}`,
    weekKey: isoWeekKey(date),
    monthKey: `${year}${month}`,
  }
}

/** 从降序排列的备份列表里，按 keyOf 取每组最新的 N 份 */
function newestPerPeriod(sortedGroups, limit, keyOf) {
  const picked = []
  const seen = new Set()

  if (limit <= 0) {
    return picked
  }

  for (const group of sortedGroups) {
    const key = keyOf(group.parsed)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    picked.push(group)

    if (picked.length >= limit) {
      break
    }
  }

  return picked
}

/**
 * 计算保留计划（纯函数，不触碰文件系统）。
 * @param {string[]} fileNames 目录内的文件名（含附属文件）
 * @param {{ daily?: number, weekly?: number, monthly?: number, now?: Date }} [options]
 * @returns {{ keep: string[], delete: string[], unmanaged: string[] }}
 */
export function planRetention(fileNames, options = {}) {
  const daily = options.daily ?? 7
  const weekly = options.weekly ?? 4
  const monthly = options.monthly ?? 3
  const nowMs = (options.now ?? new Date()).getTime()

  const groups = new Map()
  const unmanaged = []

  for (const fileName of fileNames) {
    const baseName = stripSidecar(fileName)
    const parsed = parseBackupName(baseName)

    if (!parsed) {
      unmanaged.push(fileName)
      continue
    }

    if (!groups.has(baseName)) {
      groups.set(baseName, { baseName, parsed, members: [] })
    }

    groups.get(baseName).members.push(fileName)
  }

  const byPrefix = new Map()

  for (const group of groups.values()) {
    const list = byPrefix.get(group.parsed.prefix) ?? []

    list.push(group)
    byPrefix.set(group.parsed.prefix, list)
  }

  const keepGroups = new Set()

  for (const prefixGroups of byPrefix.values()) {
    const sorted = [...prefixGroups].sort((a, b) => b.parsed.timestamp - a.parsed.timestamp)

    // 未来时间戳（时钟漂移）一律保留，但不参与分桶，
    // 避免一个错误的时间戳把正常备份全部挤出保留窗口。
    const relevant = sorted.filter((group) => group.parsed.timestamp <= nowMs)

    for (const group of sorted) {
      if (group.parsed.timestamp > nowMs) {
        keepGroups.add(group)
      }
    }

    // 每个前缀最新的一份始终保留
    if (relevant.length > 0) {
      keepGroups.add(relevant[0])
    }

    for (const group of newestPerPeriod(relevant, daily, (parsed) => parsed.dateKey)) {
      keepGroups.add(group)
    }

    for (const group of newestPerPeriod(relevant, weekly, (parsed) => parsed.weekKey)) {
      keepGroups.add(group)
    }

    for (const group of newestPerPeriod(relevant, monthly, (parsed) => parsed.monthKey)) {
      keepGroups.add(group)
    }
  }

  const keep = []
  const remove = []

  for (const group of groups.values()) {
    const target = keepGroups.has(group) ? keep : remove

    for (const member of group.members) {
      target.push(member)
    }
  }

  // 未识别文件永不进入删除列表
  keep.push(...unmanaged)

  return {
    keep: keep.sort(),
    delete: remove.sort(),
    unmanaged: [...unmanaged].sort(),
  }
}

function usage() {
  return [
    'usage: retention.mjs [--dir <backup-dir>] [--daily N] [--weekly N] [--monthly N] [--max-delete N] [--apply]',
    '',
    '默认 dry-run：只输出计划。只有 --apply 才会删除文件。',
  ].join('\n')
}

function parseArgs(argv) {
  const options = {
    dir: process.env.BACKUP_DIR || '/backups',
    daily: 7,
    weekly: 4,
    monthly: 3,
    maxDelete: 0,
    apply: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      options.apply = true
      continue
    }

    // 显式 dry-run（默认行为，允许显式书写以便运维脚本自文档化）
    if (arg === '--dry-run') {
      options.apply = false
      continue
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    const [flag, inlineValue] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined]
    const value = inlineValue ?? argv[index + 1]
    const consume = inlineValue === undefined

    switch (flag) {
      case '--dir':
        options.dir = value
        break
      case '--daily':
        options.daily = Number(value)
        break
      case '--weekly':
        options.weekly = Number(value)
        break
      case '--monthly':
        options.monthly = Number(value)
        break
      case '--max-delete':
        options.maxDelete = Number(value)
        break
      default:
        throw new Error(`unknown argument: ${arg}`)
    }

    if (consume) {
      index += 1
    }
  }

  for (const key of ['daily', 'weekly', 'monthly', 'maxDelete']) {
    if (!Number.isInteger(options[key]) || options[key] < 0) {
      throw new Error(`${key} must be a non-negative integer`)
    }
  }

  return options
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isFile()) {
      files.push(entry.name)
      continue
    }

    // 备份目录结构为 <dir>/db 与 <dir>/media：只下探一层（同一目录内按前缀分别保留）
    if (entry.isDirectory()) {
      const nested = await listFiles(path.join(directory, entry.name))

      for (const name of nested) {
        files.push(path.posix.join(entry.name, name))
      }
    }
  }

  return files
}

/** 按目录分组执行保留计划（db/ 与 media/ 分别计算，互不影响） */
function planPerDirectory(files, options) {
  const byDirectory = new Map()

  for (const file of files) {
    const directory = path.posix.dirname(file)

    byDirectory.set(directory, [...(byDirectory.get(directory) ?? []), path.posix.basename(file)])
  }

  const keep = []
  const remove = []
  const unmanaged = []

  for (const [directory, names] of byDirectory) {
    const plan = planRetention(names, options)
    const join = (name) => (directory === '.' ? name : path.posix.join(directory, name))

    keep.push(...plan.keep.map(join))
    remove.push(...plan.delete.map(join))
    unmanaged.push(...plan.unmanaged.map(join))
  }

  return { keep: keep.sort(), delete: remove.sort(), unmanaged: unmanaged.sort() }
}

export async function runRetention(argv, io = console) {
  const options = parseArgs(argv)

  if (options.help) {
    io.log(usage())
    return 0
  }

  const directoryStat = await stat(options.dir).catch(() => null)

  if (!directoryStat?.isDirectory()) {
    io.error(`backup directory not found: ${options.dir}`)
    return 1
  }

  const files = await listFiles(options.dir)
  const plan = planPerDirectory(files, options)

  io.log(
    `[retention] dir=${options.dir} policy=daily:${options.daily},weekly:${options.weekly},monthly:${options.monthly} ` +
      `total=${files.length} keep=${plan.keep.length} delete=${plan.delete.length} unmanaged=${plan.unmanaged.length}`,
  )

  for (const file of plan.delete) {
    io.log(`[retention] ${options.apply ? 'delete' : 'would delete'}: ${file}`)
  }

  for (const file of plan.unmanaged) {
    io.log(`[retention] keep (unmanaged name): ${file}`)
  }

  if (!options.apply) {
    io.log(`[retention] dry-run: no file removed (${plan.delete.length} would be removed)`)
    return 0
  }

  if (options.maxDelete > 0 && plan.delete.length > options.maxDelete) {
    io.error(
      `refusing to delete ${plan.delete.length} files (--max-delete ${options.maxDelete}); re-run with a higher limit if intended`,
    )
    return 1
  }

  let removed = 0

  for (const file of plan.delete) {
    await rm(path.join(options.dir, file))
    removed += 1
  }

  io.log(`[retention] removed ${removed} file(s)`)

  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  try {
    process.exitCode = await runRetention(process.argv.slice(2))
  } catch (error) {
    console.error(`[retention] ERROR: ${error instanceof Error ? error.message : String(error)}`)
    console.error(usage())
    process.exitCode = 1
  }
}
