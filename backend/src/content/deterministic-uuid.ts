import { createHash } from 'node:crypto'

/**
 * 由稳定字符串派生**确定性 UUID**（UUID v5 风格：sha256 前 16 字节 + version/variant 位）。
 *
 * 为什么需要它：
 * `Experience` 没有 slug，也没有其它唯一列（DATABASE §20），因此内容导入脚本找不到
 * 「同一条经历」的稳定标识。若用随机 id，每次运行都会插入重复行。
 * 用「稳定 key → 确定性 UUID」作为主键，即可用 `upsert({ where: { id } })` 实现幂等。
 *
 * 不引入 `uuid` 依赖：Node 标准库足够，输出是合法 UUID（可写入 `@db.Uuid` 列）。
 */
export function deterministicUuid(seed: string): string {
  const digest = createHash('sha256').update(seed).digest()
  const bytes = Buffer.from(digest.subarray(0, 16))

  // RFC 4122：version = 5（name-based），variant = 10xx
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex = bytes.toString('hex')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}
