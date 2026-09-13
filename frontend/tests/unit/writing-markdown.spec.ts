import { describe, expect, it } from 'vitest'
import { parseWritingInline, toWritingBlocks } from '~/utils/content'

// Phase 4-D：Markdown 语义在渲染层的回归保护。
// 背景：修复前 `- item` 每个条目会生成一个空 items 的列表（文字丢失），
// 且 `# Heading` 会被当成普通段落。

const MARKDOWN = [
  '# Heading',
  '',
  'A paragraph with **bold** text and `inline code`.',
  '',
  '- item one',
  '- item two',
  '',
  '## Section',
  '',
  'Another paragraph.',
  '',
  '```js',
  'const hello = "world"',
  '```',
].join('\n')

describe('toWritingBlocks', () => {
  it('keeps headings, list items, paragraphs and code fences', () => {
    const blocks = toWritingBlocks(MARKDOWN)

    expect(blocks.map((block) => block.kind)).toEqual([
      'heading',
      'paragraph',
      'list',
      'heading',
      'paragraph',
      'code',
    ])

    const [h1, paragraph, list, h2, , code] = blocks

    expect(h1).toMatchObject({ kind: 'heading', level: 2, text: 'Heading' })
    expect(paragraph).toMatchObject({ kind: 'paragraph' })
    expect(list).toMatchObject({ kind: 'list', items: ['item one', 'item two'] })
    expect(h2).toMatchObject({ kind: 'heading', level: 2, text: 'Section' })
    expect(code).toMatchObject({ kind: 'code', code: 'const hello = "world"' })
  })

  it('renders ### as a third level heading and keeps loose paragraphs', () => {
    const blocks = toWritingBlocks('### Deep\n\ntext')

    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 3, text: 'Deep' })
    expect(blocks[1]).toMatchObject({ kind: 'paragraph', text: 'text' })
  })

  it('returns no blocks for empty content', () => {
    expect(toWritingBlocks(null)).toEqual([])
    expect(toWritingBlocks('   ')).toEqual([])
  })
})

describe('parseWritingInline', () => {
  it('parses bold, italic and inline code without losing plain text', () => {
    expect(parseWritingInline('A **bold** and *italic* and `code` mix')).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ' and ' },
      { kind: 'em', text: 'italic' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ' mix' },
    ])
  })

  it('keeps unmatched markers as plain text', () => {
    expect(parseWritingInline('2 * 3 = 6')).toEqual([{ kind: 'text', text: '2 * 3 = 6' }])
    expect(parseWritingInline('unclosed **bold')).toEqual([{ kind: 'text', text: 'unclosed **bold' }])
  })

  it('returns nothing for empty input', () => {
    expect(parseWritingInline('')).toEqual([])
    expect(parseWritingInline(null)).toEqual([])
  })
})
