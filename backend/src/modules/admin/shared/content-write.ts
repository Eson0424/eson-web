import type { ContentStatus } from '@prisma/client'
import { conflict } from '../../../common/errors/app-error.js'

export interface ContentWriteErrorMessages {
  /** P2002：slug 唯一约束冲突 */
  conflict: string
  /** P2003：引用的 category / tag / media 不存在 */
  relation: string
}

/** PUBLISHED 必须有 publishedAt；其它状态保留已有值（不伪造发布时间） */
export function resolvePublishedAt(
  status: ContentStatus | string,
  provided: string | null | undefined,
  existing?: Date | null,
): Date | null {
  if (status !== 'PUBLISHED') {
    return existing ?? null
  }

  if (provided) {
    const parsed = new Date(provided)

    return Number.isNaN(parsed.getTime()) ? (existing ?? new Date()) : parsed
  }

  return existing ?? new Date()
}

/** Prisma 唯一约束 / 外键冲突 → 统一 CONFLICT envelope（docs/API.md §6） */
export function mapContentWriteError(
  error: unknown,
  messages: ContentWriteErrorMessages,
): Error {
  const code = (error as { code?: string })?.code

  if (code === 'P2002') {
    return conflict(messages.conflict)
  }

  if (code === 'P2003') {
    return conflict(messages.relation)
  }

  return error as Error
}

export interface RelationReplacement {
  /** undefined = 不修改该关系；[] = 清空 */
  ids?: string[]
  /** 清空既有 join 行 */
  clear: () => Promise<unknown>
  /** 写入新的 join 行 */
  create: (ids: string[]) => Promise<unknown>
}

/**
 * 关系为替换语义（replace）：
 * - 不传 → keep
 * - 传 [] → clear
 * - 传列表 → clear 后 create
 */
export async function replaceRelations(replacements: RelationReplacement[]): Promise<void> {
  for (const replacement of replacements) {
    if (!replacement.ids) {
      continue
    }

    await replacement.clear()

    if (replacement.ids.length > 0) {
      await replacement.create(replacement.ids)
    }
  }
}
