/**
 * 合并 class 字符串，过滤掉条件为 false 的项。
 * 仅做拼接，不做 Tailwind 冲突解析——组件内部保持单一职责的 class 归属。
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
