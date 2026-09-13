/**
 * Experience 专用常量（DATABASE §20–22）。
 *
 * 注意：`experiences.employment_type` 在数据库中是无约束的字符串列，
 * 取值来自 DATABASE §22 的建议列表，由 Admin DTO 在应用层强制。
 */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'FREELANCE',
  'CONTRACT',
  'SELF_EMPLOYED',
  'OTHER',
] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

/**
 * Experience 列表排序白名单。
 * Experience 没有 published_at 列，因此不能复用 Work / Lab / Writing 的 SORT_FIELDS。
 */
export const EXPERIENCE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'sortOrder',
  'startDate',
  'endDate',
] as const

export type ExperienceSortField = (typeof EXPERIENCE_SORT_FIELDS)[number]
