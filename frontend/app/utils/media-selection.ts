/**
 * MediaPicker / Gallery 的纯选择逻辑（Phase 4-F.5）。
 *
 * 顺序即契约：Gallery 的数组顺序会被后端写成 `sort_order`（Work / Lab / Writing 共用），
 * 因此这里所有函数都保持“稳定顺序”，不做排序或去重后的隐式重排。
 */

/** 去重并保留首次出现的位置（后端 DTO 同样是 ArrayUnique） */
export function normalizeSelection(ids: readonly string[]): string[] {
  return [...new Set(ids)]
}

/** 多选：已选中则取消，未选中则追加到末尾 */
export function toggleSelection(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id]
}

/** 单选（Cover）：点到当前项时取消，点到其它项时替换；始终保持 0..1 */
export function selectOnly(ids: readonly string[], id: string): string[] {
  return ids.length === 1 && ids[0] === id ? [] : [id]
}

export function removeSelection(ids: readonly string[], id: string): string[] {
  return ids.filter((current) => current !== id)
}

/** 移动到位（越界或原地不动时返回等值的新数组，调用方可安全赋值） */
export function moveSelection(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids]

  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) {
    return next
  }

  const [moved] = next.splice(from, 1)

  next.splice(to, 0, moved as string)

  return next
}

export function canMoveUp(index: number): boolean {
  return index > 0
}

export function canMoveDown(index: number, total: number): boolean {
  return index >= 0 && index < total - 1
}

/** Gallery 行：id 一定存在，媒体详情可能尚未解析出来（此时 item 为 null） */
export interface SelectedMediaRow<T> {
  id: string
  item: T | null
}

export function toSelectedRows<T extends { id: string }>(
  ids: readonly string[],
  media: readonly T[],
): Array<SelectedMediaRow<T>> {
  const byId = new Map(media.map((item) => [item.id, item]))

  return ids.map((id) => ({ id, item: byId.get(id) ?? null }))
}
