import { describe, expect, it } from 'vitest'
import { slugifyHeading, toLabSections, toWorkSections, toWritingBlocks } from '../../app/utils/content'

// Phase 3 cleanup：旧的 frontend/app/data/* 已删除（内容来自 API）。
// 这里改为覆盖真实的 adapter 层：API 的 content 字符串 → 页面所需的章节 / 内容块。

describe('content adapter', () => {
  it('returns no sections for empty content', () => {
    expect(toWorkSections(null, 'Eson_web')).toEqual([])
    expect(toLabSections('   ', 'Experiment')).toEqual([])
    expect(toWritingBlocks(undefined)).toEqual([])
  })

  it('splits work content into sections by markdown headings', () => {
    const sections = toWorkSections(
      ['## 概述', '第一段。', '## 实现', '第二段。'].join('\n'),
      'Fallback title',
    )

    expect(sections.map((section) => section.title)).toEqual(['概述', '实现'])
    expect(sections[0]?.paragraphs).toEqual(['第一段。'])
    expect(sections.every((section) => section.id.length > 0)).toBe(true)
  })

  it('keeps a single fallback section when content has no headings', () => {
    const sections = toWorkSections('One plain paragraph.', 'Eson_web')

    expect(sections).toHaveLength(1)
    expect(sections[0]?.paragraphs).toEqual(['One plain paragraph.'])
  })

  it('marks technology and interaction sections for lab content', () => {
    const sections = toLabSections(
      ['## technology', 'Stack notes.', '## interaction', 'Preview notes.'].join('\n'),
      'Fallback',
    )

    expect(sections.map((section) => section.kind)).toEqual(['technology', 'interaction'])
  })

  it('transforms article content into typed blocks', () => {
    const blocks = toWritingBlocks(
      ['Intro paragraph.', '## Section', 'Body paragraph.', '```ts', 'const a = 1', '```'].join('\n'),
    )

    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'heading', 'paragraph', 'code'])
    expect(blocks.filter((block) => block.kind === 'code')).toHaveLength(1)
  })

  it('slugifies headings into url-safe ids', () => {
    expect(slugifyHeading('Hello World!')).toBe('hello-world')
    expect(slugifyHeading('  Overview  ')).toBe('overview')
  })
})

// Markdown 无序列表（`- item` / `* item`）→ section.bullets。
// 背景：真实内容大量使用列表；旧解析器把它当成带 "- " 前缀的段落。
describe('content adapter — markdown bullets', () => {
  it('parses "- item" lines into bullets instead of paragraphs', () => {
    const sections = toWorkSections(
      ['## 核心工作', '- 设计整体信息架构', '- 建立统一 Design System'].join('\n'),
      'Eson_web',
    )

    expect(sections).toHaveLength(1)
    expect(sections[0]?.bullets).toEqual(['设计整体信息架构', '建立统一 Design System'])
    expect(sections[0]?.paragraphs).toEqual([])
  })

  it('parses "* item" lines into bullets', () => {
    const sections = toWorkSections(['## Stack', '* Nuxt 4', '* NestJS 12'].join('\n'), 'X')

    expect(sections[0]?.bullets).toEqual(['Nuxt 4', 'NestJS 12'])
  })

  it('keeps plain paragraphs as paragraphs', () => {
    const sections = toWorkSections(['## 背景', '这是一段普通文字。'].join('\n'), 'X')

    expect(sections[0]?.paragraphs).toEqual(['这是一段普通文字。'])
    expect(sections[0]?.bullets).toEqual([])
  })

  it('does not treat emphasis or horizontal rules as bullets', () => {
    const sections = toWorkSections(
      ['## 说明', '*emphasis* only', '---', 'plain line'].join('\n'),
      'X',
    )

    expect(sections[0]?.bullets).toEqual([])
    expect(sections[0]?.paragraphs).toEqual(['*emphasis* only', '---', 'plain line'])
  })

  it('splits paragraphs and bullets that follow a heading, keeping section order', () => {
    const sections = toWorkSections(
      [
        '## 背景',
        '一段背景说明。',
        '- 要点一',
        '- 要点二',
        '## 结果',
        '第二段结果说明。',
      ].join('\n'),
      'X',
    )

    expect(sections.map((section) => section.title)).toEqual(['背景', '结果'])
    expect(sections[0]?.paragraphs).toEqual(['一段背景说明。'])
    expect(sections[0]?.bullets).toEqual(['要点一', '要点二'])
    expect(sections[1]?.paragraphs).toEqual(['第二段结果说明。'])
    expect(sections[1]?.bullets).toEqual([])
  })

  it('collects consecutive bullets from both markers into one list, preserving order', () => {
    const sections = toWorkSections(
      ['## 列表', '- 第一', '* 第二', '- 第三'].join('\n'),
      'X',
    )

    expect(sections[0]?.bullets).toEqual(['第一', '第二', '第三'])
  })

  it('handles mixed zh-CN / en-US content without dropping lines', () => {
    const sections = toLabSections(
      [
        '## Practice',
        'Text-to-Image 与 Image-to-Image。',
        '- ControlNet',
        '- LoRA / IPAdapter',
        'Batch generation notes.',
      ].join('\n'),
      'Lab',
    )

    expect(sections[0]?.paragraphs).toEqual([
      'Text-to-Image 与 Image-to-Image。',
      'Batch generation notes.',
    ])
    expect(sections[0]?.bullets).toEqual(['ControlNet', 'LoRA / IPAdapter'])
  })

  it('ignores a heading with neither paragraphs nor bullets', () => {
    const sections = toWorkSections(['## 空章节', '## 有内容', '正文'].join('\n'), 'X')

    expect(sections.map((section) => section.title)).toEqual(['有内容'])
  })

  it('keeps bullets-only content (no paragraph) as a real section', () => {
    const sections = toWorkSections(['- 只有列表', '- 第二项'].join('\n'), 'X')

    expect(sections).toHaveLength(1)
    expect(sections[0]?.bullets).toEqual(['只有列表', '第二项'])
  })
})
