import { createHash } from 'node:crypto'

/**
 * IP 哈希：用于反滥用，不保存原始 IP（docs/API.md §17、AGENTS §28）。
 * 盐值来自环境变量，缺失时退化为进程内固定盐并在启动日志中提示。
 */
export function hashIp(ip: string | undefined, salt: string): string | null {
  if (!ip) {
    return null
  }

  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
