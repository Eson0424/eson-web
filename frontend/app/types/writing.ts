import type { MediaRef } from './content'

/** URL-safe slug（docs/API.md §30） */
export const WRITING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 文章正文块（← WritingTranslation.content）。
 * 当前只提供渲染所需的最小集合；Markdown 富文本与代码高亮留到后续阶段。
 */
export type WritingContentBlock =
  | { kind: 'paragraph'; id: string; text: string }
  | { kind: 'heading'; id: string; level: 2 | 3; text: string }
  | { kind: 'list'; id: string; items: string[]; ordered?: boolean }
  | { kind: 'quote'; id: string; text: string; attribution?: string }
  | { kind: 'code'; id: string; language?: string; code: string }

/**
 * 行内 Markdown 片段（**bold** / *italic* / `code`）。
 * 渲染由组件完成，文本始终按纯文本节点输出，不做 HTML 注入。
 */
export type WritingInlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'code'; text: string }

/** 列表项视图模型，字段方向对齐 DATABASE §16/§18 与 API §12。 */
export interface WritingSummary {
  id: string
  slug: string
  /** ← WritingTranslation.title */
  title: string
  /** ← WritingTranslation.subtitle */
  subtitle?: string
  /** ← WritingTranslation.excerpt（列表摘要） */
  excerpt: string
  /** ← Category translations */
  categories: string[]
  /** ← Tag translations */
  tags: string[]
  /** ← Writing.published_at（ISO 8601，UTC） */
  publishedAt?: string
  /** ← Writing.reading_time（分钟） */
  readingTimeMinutes: number
  /** ← Writing.featured */
  featured?: boolean
  /** ← Writing.cover_media_id */
  cover?: MediaRef
}

export interface WritingDetail extends WritingSummary {
  /** ← WritingTranslation.seo_title */
  seoTitle?: string
  /** ← WritingTranslation.seo_description */
  seoDescription?: string
  /** ← WritingTranslation.content */
  content: WritingContentBlock[]
}
