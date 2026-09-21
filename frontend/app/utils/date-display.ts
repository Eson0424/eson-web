/**
 * Public 展示层的日期格式化。
 *
 * 背景：API / 数据库返回的是完整 ISO 日期（例如 `2025-07-01`），
 * 而 Public 时间线只需要展示到月份。直接拼接原始值会把 ISO 字符串暴露给访客。
 *
 * 约束：
 * - 只做展示格式化，**不修改** API 数据、数据库值或类型定义；
 * - 无法识别的格式原样返回（宁可显示已有文本，也不丢失信息）。
 */

/** 匹配 ISO 日期的年与月（`2025-07-01` / `2025-07-01T00:00:00Z` 均可） */
const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})/

/**
 * `2025-07-01` → `2025.07`
 *
 * 空值返回 null（调用方负责过滤），非 ISO 前缀的值原样返回。
 */
export function formatYearMonth(value: string | null | undefined): string | null {
  const raw = value?.trim()

  if (!raw) {
    return null
  }

  const matched = YEAR_MONTH_PATTERN.exec(raw)

  if (!matched) {
    return raw
  }

  return `${matched[1]}.${matched[2]}`
}

/**
 * 与 `formatYearMonth` 相同，但没有日期时返回占位符 `—`。
 *
 * 用于「这个字段一定占位」的信息块（例如 Lab 详情的发布时间），
 * 避免模板里再拼一遍 `?? '—'`。
 */
export function formatYearMonthOrDash(value: string | null | undefined): string {
  return formatYearMonth(value) ?? '—'
}
