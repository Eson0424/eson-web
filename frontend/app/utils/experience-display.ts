/**
 * Public Experience 展示规则。
 *
 * 数据库与 Admin 保留完整的 employmentType 枚举值；Public 层只决定「要不要展示」：
 * - `OTHER` 用于学历等并非雇佣类型的条目，在公开时间线上没有语义，因此不展示；
 * - 其余取值由 i18n（`experience.employmentTypes.*`）提供文案；
 * - 任何没有文案的取值同样不展示，避免把数据库枚举泄露给访客。
 */
const PUBLIC_HIDDEN_EMPLOYMENT_TYPES: readonly string[] = ['OTHER']

/** 该 employmentType 是否应该在 Public 页面展示。 */
export function isPublicEmploymentTypeVisible(value: string | null | undefined): boolean {
  if (!value) {
    return false
  }

  return !PUBLIC_HIDDEN_EMPLOYMENT_TYPES.includes(value)
}
