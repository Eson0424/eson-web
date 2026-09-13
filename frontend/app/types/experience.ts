/** URL-safe slug（docs/API.md §30） */
export const EXPERIENCE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 经历视图模型。字段方向对齐 docs/DATABASE.md §20/§21（Experience / ExperienceTranslation）
 * 与 docs/API.md §13。
 *
 * 注意：本阶段没有真实职业经历数据，因此数据源只包含 `placeholder: true` 的占位条目，
 * 不包含公司、职位、时间、职责或成果等任何可能被误读为真实履历的信息。
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
  /** 本阶段专用：标记占位条目，接入真实内容后移除 */
  placeholder?: boolean
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
