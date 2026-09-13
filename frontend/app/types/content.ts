import type { LabSummary } from './lab'
import type { ExperienceSummary } from './experience'
import type { WritingSummary } from './writing'

/**
 * 首页视图模型（Phase 2B）。
 *
 * 这些类型刻意贴近 docs/API.md 的响应字段（Work / Lab / Writing / Experience），
 * 后续接入真实 API 时，只需把 useHomeContent() 的数据来源从 mock 换成 service 调用，
 * Section 组件（Home*）与条目组件（WorkShowcaseItem 等）无需改动。
 */

export interface MediaRef {
  src: string
  alt: string
  width?: number
  height?: number
}

export type StatusState = 'online' | 'busy' | 'offline'

export interface CallToAction {
  label: string
  /** 内部路由或页面内锚点 */
  to?: string
  /** 外部链接 */
  href?: string
}

export interface StatusContent {
  label: string
  state: StatusState
}

export interface HeroContent {
  systemStatus: StatusContent
  brand: string
  /** 逐行渲染的标题（PRD §4.2 正式使用英文品牌标题） */
  headline: string[]
  lead: string
  /** 为 null 时不渲染状态，避免出现未经确认的可用性声明（AGENTS §45） */
  availability: StatusContent | null
  primaryAction: CallToAction
}

export interface IntroContent {
  headline: string[]
  body: string
  focusAreas: string[]
}

export interface WorkSummary {
  id: string
  slug: string
  /** ← WorkTranslation.title */
  title: string
  /** ← WorkTranslation.subtitle */
  subtitle?: string
  /** ← WorkTranslation.summary */
  summary: string
  /** ← Category translations */
  categories: string[]
  /** ← Tag translations（界面显示为 Technology，DESIGN §46） */
  technologies: string[]
  year?: string
  cover?: MediaRef
  /** ← Work.featured */
  featured?: boolean
  /** ← Work.start_date */
  startDate?: string
  /** ← Work.end_date */
  endDate?: string | null
  /** ← Work.published_at（ISO 8601，UTC） */
  publishedAt?: string
  /** ← Work.github_url（无真实数据时保持 undefined） */
  githubUrl?: string
  /** ← Work.demo_url（无真实数据时保持 undefined） */
  demoUrl?: string
  /** ← Work.project_url（无真实数据时保持 undefined） */
  projectUrl?: string
}

export interface Capability {
  id: string
  title: string
  description: string
  technologies: string[]
}

export interface SocialLink {
  label: string
  href: string
}

export interface SectionContent<TItem> {
  /** 章节序号，例如 01（DESIGN §12） */
  index: string
  /** 章节标签，例如 SELECTED WORK */
  kicker: string
  title: string
  lede?: string
  items: TItem[]
}

export interface ContactContent {
  headline: string[]
  body: string
  action: CallToAction
  socials: SocialLink[]
}

export interface HomeContent {
  hero: HeroContent
  intro: IntroContent
  selectedWork: SectionContent<WorkSummary>
  capabilities: SectionContent<Capability>
  lab: SectionContent<LabSummary>
  writing: SectionContent<WritingSummary>
  experience: SectionContent<ExperienceSummary>
  contact: ContactContent
}
