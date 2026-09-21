/** URL-safe slug（docs/API.md §30） */
export const EXPERIENCE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 经历视图模型。字段方向对齐 docs/DATABASE.md §20/§21（Experience / ExperienceTranslation）
 * 与 docs/API.md §13。
 *
 * 注意：只有真实存在的字段才会被填充；缺失字段保持 undefined，页面不渲染空行。
 */
export interface ExperienceSummary {
  id: string
  slug: string
  /** ← ExperienceTranslation.role_name */
  title: string
  /** ← ExperienceTranslation.company_name（无真实数据时为 undefined） */
  organization?: string
  /** ← Experience.location */
  location?: string
  /** ← Experience.employment_type */
  employmentType?: string
  /** ← Experience.start_date */
  startDate?: string
  /** ← Experience.end_date */
  endDate?: string | null
  /** ← Experience.is_current */
  current?: boolean
  /** ← ExperienceTranslation.summary */
  summary: string
  /** ← Tag translations */
  technologies: string[]
  featured?: boolean
}

export interface ExperienceDetail extends ExperienceSummary {
  /** ← ExperienceTranslation.content（本阶段按职责条目结构化） */
  responsibilities: string[]
  /** 仅在有可核实的真实成果时填充 */
  achievements: string[]
  /** ← ExperienceTranslation.seo_title */
  seoTitle?: string
  /** ← ExperienceTranslation.seo_description */
  seoDescription?: string
}
