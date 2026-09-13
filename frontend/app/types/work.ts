import type { MediaRef, WorkSummary } from './content'

/** URL-safe slug（docs/API.md §30） */
export const WORK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Case Study 章节顺序（PRD §10.2、DESIGN §15）。
 * 数据库只保存一个 `content` 字段（DATABASE §11），
 * 这里按章节结构化，便于渲染与后续把 API 的 content 映射进来。
 */
export const WORK_SECTION_ORDER = [
  'overview',
  'problem',
  'approach',
  'architecture',
  'technology',
  'design',
  'implementation',
  'results',
] as const

export type WorkSectionId = (typeof WORK_SECTION_ORDER)[number]

export interface WorkCaseStudySection {
  id: WorkSectionId
  /** technology 章节会额外渲染该 Work 的技术栈标签 */
  kind: 'text' | 'technology'
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export interface WorkGalleryItem {
  id: string
  caption: string
  /** ← Media；暂无真实素材时留空，由 PlaceholderVisual 渲染占位视觉 */
  media?: MediaRef
}

/** Case study 顶部的真实链接；没有真实地址时不要构造 */
export interface WorkLink {
  label: string
  href: string
}

export interface WorkDetail extends WorkSummary {
  /** ← WorkTranslation.seo_title */
  seoTitle?: string
  /** ← WorkTranslation.seo_description */
  seoDescription?: string
  sections: WorkCaseStudySection[]
  gallery: WorkGalleryItem[]
}
