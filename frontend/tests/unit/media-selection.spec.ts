import { describe, expect, it } from 'vitest'
import {
  canMoveDown,
  canMoveUp,
  moveSelection,
  normalizeSelection,
  removeSelection,
  selectOnly,
  toggleSelection,
  toSelectedRows,
} from '~/utils/media-selection'

// Phase 4-F.5：MediaPicker / Gallery 的选择与排序纯逻辑。
// 数组顺序就是后端 sort_order，所以这里必须保证顺序稳定。

describe('selection basics', () => {
  it('dedupes while keeping the first occurrence position', () => {
    expect(normalizeSelection(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
    expect(normalizeSelection([])).toEqual([])
  })

  it('toggles multi selection by appending to the end', () => {
    expect(toggleSelection(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleSelection(['b', 'a'], 'a')).toEqual(['b'])
  })

  it('keeps cover selection at 0..1', () => {
    expect(selectOnly([], 'a')).toEqual(['a'])
    expect(selectOnly(['a'], 'b')).toEqual(['b'])
    expect(selectOnly(['a'], 'a')).toEqual([])
  })

  it('removes without touching the remaining order', () => {
    expect(removeSelection(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(removeSelection(['a'], 'missing')).toEqual(['a'])
  })
})

describe('gallery ordering', () => {
  it('moves an item up / down deterministically', () => {
    expect(moveSelection(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveSelection(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveSelection(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('ignores out-of-range moves and never mutates the input', () => {
    const ids = ['a', 'b']

    expect(moveSelection(ids, 0, 5)).toEqual(['a', 'b'])
    expect(moveSelection(ids, -1, 0)).toEqual(['a', 'b'])
    expect(ids).toEqual(['a', 'b'])
  })

  it('disables move up at the first row and move down at the last row', () => {
    expect(canMoveUp(0)).toBe(false)
    expect(canMoveUp(1)).toBe(true)
    expect(canMoveDown(0, 1)).toBe(false)
    expect(canMoveDown(0, 3)).toBe(true)
    expect(canMoveDown(2, 3)).toBe(false)
  })
})

describe('toSelectedRows', () => {
  it('keeps the gallery order and marks unresolved media as null', () => {
    const media = [
      { id: 'b', url: 'http://media.test/b.webp' },
      { id: 'c', url: 'http://media.test/c.webp' },
    ]

    expect(toSelectedRows(['c', 'missing', 'b'], media)).toEqual([
      { id: 'c', item: { id: 'c', url: 'http://media.test/c.webp' } },
      { id: 'missing', item: null },
      { id: 'b', item: { id: 'b', url: 'http://media.test/b.webp' } },
    ])
  })

  it('returns an empty list for an empty gallery', () => {
    expect(toSelectedRows([], [{ id: 'a' }])).toEqual([])
  })
})
