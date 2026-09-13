import type { MediaRef } from './content'

/** URL-safe slug（docs/API.md §30） */
export const LAB_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 实验阶段标签（展示用）。
 * 发布状态（DRAFT / PUBLISHED / ARCHIVED，DATABASE §14）由 API 控制：
 * Public API 只返回 PUBLISHED，因此前端不展示发布状态。
 */
export type LabStatus = 'prototype' | 'ongoing' | 'research' | 'paused'

/** Case 结构顺序（PRD §11.3、DESIGN §16） */
export const LAB_SECTION_ORDER = [
  'overview',
  'experiment',
  'technology',
  'implementation',
  'interaction',
  'observations',
] as const

export type LabSectionId = (typeof LAB_SECTION_ORDER)[number]

export interface LabSection {
  id: LabSectionId
  /** technology 渲染技术栈；interaction 渲染 live preview 占位 */
  kind: 'text' | 'technology' | 'interaction'
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export interface LabGalleryItem {
  id: string
  caption: string
  /** ← Media；暂无真实素材时留空，由 PlaceholderVisual 渲染 */
  media?: MediaRef
}

export interface LabLink {
  label: string
  href: string
}

/**
 * 列表项视图模型。字段方向对齐 docs/DATABASE.md §13/§15（Lab / LabTranslation）
 * 与 docs/API.md §11。
 */
export interface LabSummary {
  id: string
  slug: string
  /** ← LabTranslation.title */
  title: string
  /** ← LabTranslation.subtitle */
  subtitle?: string
  /** ← LabTranslation.summary */
  summary: string
  /** 实验阶段标签（见 LabStatus 注释） */
  status: LabStatus
  /** ← Lab.featured */
  featured?: boolean
  /** ← Lab.published_at 的年份（展示用） */
  year?: string
  /** ← Lab.cover_media_id */
  cover?: MediaRef
  /** ← Category translations */
  categories: string[]
  /** ← Tag translations（界面显示为 Technology） */
  technologies: string[]
  /** ← Lab.published_at（ISO 8601，UTC） */
  publishedAt?: string
  /** ← Lab.github_url（无真实数据时保持 undefined） */
  githubUrl?: string
  /** ← Lab.demo_url（无真实数据时保持 undefined） */
  demoUrl?: string
  /** ← Lab.project_url（无真实数据时保持 undefined） */
  projectUrl?: string
}

export interface LabDetail extends LabSummary {
  /** ← LabTranslation.seo_title */
  seoTitle?: string
  /** ← LabTranslation.seo_description */
  seoDescription?: string
  /** ← LabTranslation.content（本阶段按 LAB_SECTION_ORDER 结构化） */
  sections: LabSection[]
  gallery: LabGalleryItem[]
}
