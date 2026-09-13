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
