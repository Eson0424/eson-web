import type { WritingContentBlock, WritingInlineNode } from '~/types/writing'
import type { LabSection, LabSectionId } from '~/types/lab'
import type { WorkCaseStudySection, WorkSectionId } from '~/types/work'

const WORK_SECTION_IDS: WorkSectionId[] = [
  'overview',
  'problem',
  'approach',
  'architecture',
  'technology',
  'design',
  'implementation',
  'results',
]

const LAB_SECTION_IDS: LabSectionId[] = [
  'overview',
  'experiment',
  'technology',
  'implementation',
  'interaction',
  'observations',
]

export function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * 把 API 返回的 content 字符串拆成章节。
 * V1 的 content 是 Markdown 风格文本（DATABASE §11 允许 Markdown）；
 * 这里只做最小解析：以 `## 标题` 分段，无标题时整体作为一个章节。
 */
export function parseContentSections<TId extends string>(
  content: string | null | undefined,
  ids: TId[],
  fallbackTitle: string,
): Array<{ id: TId; title: string; paragraphs: string[] }> {
  const text = (content ?? '').trim()

  if (text.length === 0) {
    return []
  }

  const blocks: Array<{ id: TId; title: string; paragraphs: string[] }> = []
  let currentTitle = fallbackTitle
  let currentParagraphs: string[] = []

  const flush = () => {
    const paragraphs = currentParagraphs.map((line) => line.trim()).filter(Boolean)

    // 没有正文就不要生成章节：避免内容以标题开头时多出一个虚假的“回退章节”
    if (paragraphs.length === 0) {
      return
    }

    const index = blocks.length
    const fallbackId = ids[Math.min(index, ids.length - 1)] ?? ids[0]

    blocks.push({
      id: (slugifyHeading(currentTitle) as TId) || (fallbackId as TId),
      title: currentTitle,
      paragraphs,
    })
  }

  for (const line of text.split(/\r?\n/)) {
    const heading = /^#{2,3}\s+(.*)$/.exec(line.trim())

    if (heading?.[1]) {
      flush()

      currentTitle = heading[1].trim()
      currentParagraphs = []
      continue
    }

    if (line.trim().length === 0) {
      continue
    }

    currentParagraphs.push(line)
  }

  flush()

  return blocks
}

export function toWorkSections(content: string | null | undefined, title: string): WorkCaseStudySection[] {
  return parseContentSections(content, WORK_SECTION_IDS, title).map((section, index) => ({
    id: section.id,
    kind: section.id === 'technology' ? ('technology' as const) : ('text' as const),
    title: section.title || `0${index + 1}`,
    paragraphs: section.paragraphs,
  }))
}

export function toLabSections(content: string | null | undefined, title: string): LabSection[] {
  return parseContentSections(content, LAB_SECTION_IDS, title).map((section) => ({
    id: section.id,
    kind:
      section.id === 'technology'
        ? ('technology' as const)
        : section.id === 'interaction'
          ? ('interaction' as const)
          : ('text' as const),
    title: section.title,
    paragraphs: section.paragraphs,
  }))
}

/** 把纯文本/Markdown 风格正文转成文章块（不引入 Markdown 解析依赖） */
export function toWritingBlocks(content: string | null | undefined): WritingContentBlock[] {
  const text = (content ?? '').trim()

  if (text.length === 0) {
    return []
  }

  const blocks: WritingContentBlock[] = []
  const lines = text.split(/\r?\n/)
  let buffer: string[] = []
  let inCode = false
  let codeLines: string[] = []
  let counter = 0

  const flushParagraph = () => {
    const paragraph = buffer.join(' ').trim()

    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', id: `block-${counter++}`, text: paragraph })
    }

    buffer = []
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({
          kind: 'code',
          id: `block-${counter++}`,
          code: codeLines.join('\n'),
        })
        codeLines = []
        inCode = false
      } else {
        flushParagraph()
        inCode = true
      }

      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    // `#` 与 `##` 都渲染为文章内的 h2：文章标题本身已经是页面的 h1
    const heading = /^(#{1,3})\s+(.*)$/.exec(line.trim())

    if (heading?.[2]) {
      flushParagraph()
      blocks.push({
        kind: 'heading',
        id: `block-${counter++}`,
        level: heading[1] === '###' ? 3 : 2,
        text: heading[2].trim(),
      })
      continue
    }

    const listItem = /^[-*]\s+(.+)$/.exec(line.trim())

    if (listItem?.[1]) {
      flushParagraph()
      const previous = blocks[blocks.length - 1]

      // 连续的项目符号归入同一个列表，且必须保留条目文本
      if (previous?.kind === 'list') {
        previous.items.push(listItem[1].trim())
      } else {
        blocks.push({
          kind: 'list',
          id: `block-${counter++}`,
          items: [listItem[1].trim()],
        })
      }

      continue
    }

    if (line.trim().length === 0) {
      flushParagraph()
      continue
    }

    buffer.push(line.trim())
  }

  flushParagraph()

  return blocks
}

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g

/**
 * 行内 Markdown 的最小解析：`code` → **strong** → *em*。
 * 未闭合的标记保持为纯文本，避免把内容吃掉。
 */
export function parseWritingInline(text: string | null | undefined): WritingInlineNode[] {
  const value = text ?? ''

  if (value.length === 0) {
    return []
  }

  const nodes: WritingInlineNode[] = []

  for (const part of value.split(INLINE_PATTERN)) {
    if (part.length === 0) {
      continue
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push({ kind: 'code', text: part.slice(1, -1) })
      continue
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      nodes.push({ kind: 'strong', text: part.slice(2, -2) })
      continue
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push({ kind: 'em', text: part.slice(1, -1) })
      continue
    }

    nodes.push({ kind: 'text', text: part })
  }

  return nodes
}
