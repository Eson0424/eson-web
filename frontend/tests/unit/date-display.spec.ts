import { describe, expect, it } from 'vitest'
import { formatYearMonth, formatYearMonthOrDash } from '../../app/utils/date-display'

// P1-1：Public 时间线日期展示。
// API / 数据库仍然返回完整 ISO 日期，这里只负责展示层格式化为 YYYY.MM。

describe('formatYearMonth', () => {
  it('formats an ISO date to YYYY.MM', () => {
    expect(formatYearMonth('2025-07-01')).toBe('2025.07')
    expect(formatYearMonth('2014-09-01')).toBe('2014.09')
  })

  it('formats a full ISO timestamp without leaking the day/time', () => {
    expect(formatYearMonth('2025-07-01T00:00:00.000Z')).toBe('2025.07')
  })

  it('accepts an already shortened YYYY-MM value', () => {
    expect(formatYearMonth('2023-09')).toBe('2023.09')
  })

  it('trims surrounding whitespace', () => {
    expect(formatYearMonth('  2025-07-01  ')).toBe('2025.07')
  })

  it('returns null for empty input so callers can skip the part', () => {
    expect(formatYearMonth(null)).toBeNull()
    expect(formatYearMonth(undefined)).toBeNull()
    expect(formatYearMonth('')).toBeNull()
    expect(formatYearMonth('   ')).toBeNull()
  })

  it('passes an unrecognised format through instead of dropping information', () => {
    expect(formatYearMonth('Jul 2025')).toBe('Jul 2025')
  })

  it('never returns a full ISO date for ISO input', () => {
    for (const value of ['2025-07-01', '2014-09-01T00:00:00.000Z']) {
      expect(formatYearMonth(value)).not.toMatch(/^\d{4}-\d{2}-\d{2}/)
    }
  })
})

// Lab 详情「发布时间」用的占位版本：有值走同一套格式化，无值显示 —。
describe('formatYearMonthOrDash', () => {
  it('formats a full ISO timestamp to YYYY.MM (Lab publishedAt)', () => {
    expect(formatYearMonthOrDash('2026-09-21T14:24:14.295Z')).toBe('2026.09')
    expect(formatYearMonthOrDash('2026-09-21')).toBe('2026.09')
  })

  it('falls back to an em dash when there is no date', () => {
    expect(formatYearMonthOrDash(null)).toBe('—')
    expect(formatYearMonthOrDash(undefined)).toBe('—')
    expect(formatYearMonthOrDash('   ')).toBe('—')
  })

  it('never leaks a raw ISO date', () => {
    expect(formatYearMonthOrDash('2026-09-21T14:24:14.295Z')).not.toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})
