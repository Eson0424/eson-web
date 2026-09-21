import { describe, expect, it } from 'vitest'
import { deterministicUuid } from './deterministic-uuid.js'
import {
  CATEGORY_SEEDS,
  EXPERIENCE_SEEDS,
  LAB_SEEDS,
  SETTING_SEEDS,
  TAG_SEEDS,
  WORK_SEEDS,
  WRITING_SEEDS,
  type ContentSeed,
  type TaxonomySeed,
} from './eson-content.js'

// Content Population Phase 1：内容数据集的质量门。
// 目的不是"让测试通过"，而是用断言把「不许编造」这条规则固定下来：
// slug 唯一且 URL 安全、双语齐全、SEO 长度符合 DTO 限制、无禁用词、无量化假成绩。

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOCALES = ['zh-CN', 'en-US'] as const

/** Work 正文必须包含的章节（AGENTS/用户确认的案例结构） */
const WORK_SECTIONS: Record<(typeof LOCALES)[number], string[]> = {
  'zh-CN': ['背景', '我的角色', '问题', '核心工作', '解决方案', '工程实现', '结果', '项目状态'],
  'en-US': ['Background', 'Role', 'Problem', 'Key work', 'Approach', 'Engineering', 'Result', 'Status'],
}

/** 明确禁止出现的营销夸大 / 无法验证的评价 */
const FORBIDDEN_WORDS = [
  'localhost',
  'example.com',
  'TODO',
  'FIXME',
  'Lorem',
  '占位',
  '尚未发布',
  '下一阶段',
  '行业顶尖',
  '行业领先',
  '资深专家',
  '首席',
  '顶级',
]

/** 未提供的社交账号（用户明确没有 GitHub / LinkedIn） */
const FORBIDDEN_SOCIAL = ['github.com', 'linkedin.com', 'github', 'linkedin']

/** 量化假成绩模式：百分比、指标后紧跟数字、中文业务指标带数字、提升/节省/增长带数字 */
const FORBIDDEN_METRIC_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?\s*%/,
  /\b(?:ROAS|ACOS|CTR|CVR|ROI)\b[^\n]{0,10}\d/,
  /(?:营收|利润|订单量|销量|销售额|客户数|客户数量|访问量|转化率|市场排名)[^\n]{0,6}\d/,
  /(?:提升|节省|增长)[^\n]{0,4}\d/,
  /Best\s?Seller/i,
]

function allContentSeeds(): Array<{ kind: string; seed: ContentSeed }> {
  return [
    ...WORK_SEEDS.map((seed) => ({ kind: 'work', seed })),
    ...LAB_SEEDS.map((seed) => ({ kind: 'lab', seed })),
    ...WRITING_SEEDS.map((seed) => ({ kind: 'writing', seed })),
  ]
}

/** 用于禁用词扫描的全部文本（内容 + 分类/标签名称 + 设置） */
function allTexts(): string[] {
  const texts: string[] = []

  for (const { seed } of allContentSeeds()) {
    texts.push(seed.slug)

    for (const translation of seed.translations) {
      texts.push(
        translation.title,
        translation.subtitle,
        translation.summary ?? '',
        translation.excerpt ?? '',
        translation.content,
        translation.seoTitle,
        translation.seoDescription,
      )
    }
  }

  for (const entry of [...CATEGORY_SEEDS, ...TAG_SEEDS]) {
    texts.push(entry.slug, entry.name['zh-CN'], entry.name['en-US'])
  }

  for (const entry of EXPERIENCE_SEEDS) {
    texts.push(entry.key)

    for (const translation of entry.translations) {
      texts.push(
        translation.companyName,
        translation.roleName,
        translation.summary,
        translation.content ?? '',
      )
    }
  }

  for (const entry of SETTING_SEEDS) {
    texts.push(entry.key, String(entry.value), entry.description)
  }

  return texts
}

describe('content dataset — structure', () => {
  it('ships the expected number of entries', () => {
    expect(WORK_SEEDS).toHaveLength(3)
    expect(LAB_SEEDS).toHaveLength(1)
    expect(WRITING_SEEDS).toHaveLength(5)
    expect(EXPERIENCE_SEEDS).toHaveLength(5)
  })

  it('uses unique, url-safe slugs per content type', () => {
    const groups: Array<[string, ContentSeed[]]> = [
      ['work', WORK_SEEDS],
      ['lab', LAB_SEEDS],
      ['writing', WRITING_SEEDS],
    ]

    for (const [kind, seeds] of groups) {
      const slugs = seeds.map((seed) => seed.slug)

      expect(new Set(slugs).size, `${kind} slugs must be unique`).toBe(slugs.length)

      for (const slug of slugs) {
        expect(slug, `${kind}: ${slug}`).toMatch(SLUG_PATTERN)
        expect(slug.length, `${kind}: ${slug}`).toBeLessThanOrEqual(120)
      }
    }
  })

  it('keeps taxonomy slugs unique and lower-case', () => {
    const groups: Array<[string, TaxonomySeed[]]> = [
      ['category', CATEGORY_SEEDS],
      ['tag', TAG_SEEDS],
    ]

    for (const [name, defs] of groups) {
      const slugs = defs.map((entry) => entry.slug)

      expect(new Set(slugs).size, `${name} slugs must be unique`).toBe(slugs.length)

      for (const slug of slugs) {
        expect(slug, `${name}: ${slug}`).toMatch(SLUG_PATTERN)
      }
    }
  })

  it('provides both locales with non-empty required fields', () => {
    for (const { kind, seed } of allContentSeeds()) {
      const locales = seed.translations.map((translation) => translation.locale).sort()

      expect(locales, `${kind}: ${seed.slug}`).toEqual(['en-US', 'zh-CN'])

      for (const translation of seed.translations) {
        const label = `${kind}: ${seed.slug} (${translation.locale})`

        expect(translation.title.length, `${label} title`).toBeGreaterThan(0)
        expect(translation.subtitle.length, `${label} subtitle`).toBeGreaterThan(0)
        expect(translation.content.length, `${label} content`).toBeGreaterThan(0)
        expect(translation.seoTitle.length, `${label} seoTitle`).toBeGreaterThan(0)
        expect(translation.seoDescription.length, `${label} seoDescription`).toBeGreaterThan(0)

        if (kind === 'writing') {
          expect(translation.excerpt?.length ?? 0, `${label} excerpt`).toBeGreaterThan(0)
        } else {
          expect(translation.summary?.length ?? 0, `${label} summary`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('respects Admin DTO length limits', () => {
    for (const { kind, seed } of allContentSeeds()) {
      for (const translation of seed.translations) {
        const label = `${kind}: ${seed.slug} (${translation.locale})`

        expect(translation.title.length, `${label} title <= 200`).toBeLessThanOrEqual(200)
        expect(translation.subtitle.length, `${label} subtitle <= 200`).toBeLessThanOrEqual(200)
        expect(translation.seoTitle.length, `${label} seoTitle <= 200`).toBeLessThanOrEqual(200)
        expect(translation.seoDescription.length, `${label} seoDescription <= 400`).toBeLessThanOrEqual(400)

        if (kind === 'writing') {
          expect(translation.excerpt?.length ?? 0, `${label} excerpt <= 2000`).toBeLessThanOrEqual(2000)
        } else {
          expect(translation.summary?.length ?? 0, `${label} summary <= 2000`).toBeLessThanOrEqual(2000)
        }
      }
    }
  })

  it('references only categories and tags that the dataset defines', () => {
    const categorySlugs = new Set(CATEGORY_SEEDS.map((entry) => entry.slug))
    const tagSlugs = new Set(TAG_SEEDS.map((entry) => entry.slug))

    for (const { kind, seed } of allContentSeeds()) {
      for (const slug of seed.categorySlugs) {
        expect(categorySlugs.has(slug), `${kind}: ${seed.slug} -> category ${slug}`).toBe(true)
      }

      for (const slug of seed.tagSlugs) {
        expect(tagSlugs.has(slug), `${kind}: ${seed.slug} -> tag ${slug}`).toBe(true)
      }

      expect(new Set(seed.tagSlugs).size, `${kind}: ${seed.slug} duplicate tags`).toBe(seed.tagSlugs.length)
      expect(new Set(seed.categorySlugs).size, `${kind}: ${seed.slug} duplicate categories`).toBe(
        seed.categorySlugs.length,
      )
    }
  })
})

describe('content dataset — publication rules', () => {
  it('publishes every Work and the Lab, and keeps every Writing as DRAFT', () => {
    for (const seed of WORK_SEEDS) {
      expect(seed.status, `work ${seed.slug}`).toBe('PUBLISHED')
      expect(seed.featured, `work ${seed.slug}`).toBe(true)
    }

    expect(LAB_SEEDS[0]?.status).toBe('PUBLISHED')

    for (const seed of WRITING_SEEDS) {
      // 草稿不得伪装成已完成文章（用户明确要求：不要为了 /writing 有内容而强制发布）
      expect(seed.status, `writing ${seed.slug}`).toBe('DRAFT')
    }
  })

  it('uses unique sortOrder for Works, Lab entries and Experiences', () => {
    const groups: Array<[string, number[]]> = [
      ['work', WORK_SEEDS.map((seed) => seed.sortOrder)],
      ['lab', LAB_SEEDS.map((seed) => seed.sortOrder)],
      ['experience', EXPERIENCE_SEEDS.map((seed) => seed.sortOrder)],
    ]

    for (const [name, orders] of groups) {
      expect(new Set(orders).size, `${name} sortOrder must be unique`).toBe(orders.length)
    }
  })

  it('gives every Work the agreed case-study sections in both locales', () => {
    for (const seed of WORK_SEEDS) {
      for (const locale of LOCALES) {
        const translation = seed.translations.find((entry) => entry.locale === locale)
        const headings = (translation?.content ?? '')
          .split('\n')
          .filter((line) => line.startsWith('## '))
          .map((line) => line.replace(/^##\s+/, '').trim())

        for (const expected of WORK_SECTIONS[locale]) {
          expect(headings, `work ${seed.slug} (${locale}) must contain section "${expected}"`).toContain(
            expected,
          )
        }
      }
    }
  })

  it('keeps the Amazon-AI diagnostic rules factual (5 named + one grouped statement)', () => {
    const zh = WORK_SEEDS.find((seed) => seed.slug === 'amazon-ai')?.translations.find(
      (entry) => entry.locale === 'zh-CN',
    )

    for (const rule of ['高花费无订单', '高 ACOS', '高点击低转化', '高曝光低 CTR', '高 ROAS']) {
      expect(zh?.content, `amazon-ai must keep rule "${rule}"`).toContain(rule)
    }

    // 简历未提供完整 9 条规则名称 → 只允许分组描述，不得编造其它具体规则
    expect(zh?.content).toContain('以及其他广告与运营指标诊断规则')
    expect(zh?.content).toContain('9 条诊断规则')
  })

  it('keeps the Amazon US Marketplace facts (5 SKUs + operations scope)', () => {
    const zh = WORK_SEEDS.find((seed) => seed.slug === 'amazon-us-marketplace')?.translations.find(
      (entry) => entry.locale === 'zh-CN',
    )

    expect(zh?.content).toContain('5 个 SKU')

    for (const area of ['产品选择', '采购', 'Listing', '广告', '数据分析', '日常运营']) {
      expect(zh?.content, `marketplace must keep "${area}"`).toContain(area)
    }
  })

  it('keeps the ComfyUI capabilities that were confirmed', () => {
    const zh = LAB_SEEDS[0]?.translations.find((entry) => entry.locale === 'zh-CN')

    for (const capability of [
      'Text-to-Image',
      'Image-to-Image',
      'Inpainting',
      'Batch Upscaling',
      'ControlNet',
      'LoRA',
      'IPAdapter',
    ]) {
      expect(zh?.content, `lab must keep "${capability}"`).toContain(capability)
    }
  })

  /**
   * 前端解析器（`frontend/app/utils/content.ts`）会丢弃「只有标题、没有正文」的章节。
   * 这里提前拦住这种内容：每个 `## 标题` 后面必须有段落或 `- ` 列表项。
   */
  it('never ships a heading without body text (parser would drop it)', () => {
    for (const { kind, seed } of allContentSeeds()) {
      for (const translation of seed.translations) {
        const lines = translation.content.split('\n')
        const label = `${kind}: ${seed.slug} (${translation.locale})`

        for (const [index, line] of lines.entries()) {
          if (!line.startsWith('## ')) {
            continue
          }

          const body = []

          for (const next of lines.slice(index + 1)) {
            if (next.startsWith('## ')) {
              break
            }

            if (next.trim().length > 0) {
              body.push(next)
            }
          }

          expect(body.length, `${label} section "${line}" must have body text`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('content dataset — experience timeline', () => {
  it('keeps unique deterministic keys', () => {
    const keys = EXPERIENCE_SEEDS.map((seed) => seed.key)

    expect(new Set(keys).size).toBe(keys.length)

    const ids = keys.map((key) => deterministicUuid(`eson-content:experience:${key}`))

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('orders the four work experiences first and the education entry last', () => {
    const sorted = [...EXPERIENCE_SEEDS].sort((a, b) => a.sortOrder - b.sortOrder)
    const education = sorted[sorted.length - 1]
    const work = sorted.slice(0, -1)

    expect(sorted).toHaveLength(5)
    expect(work).toHaveLength(4)

    expect(education?.employmentType).toBe('OTHER')
    expect(education?.isCurrent).toBe(false)
    expect(education?.startDate).toBe('2014-09-01')
    expect(education?.endDate).toBe('2018-06-30')
    expect(education?.translations.find((entry) => entry.locale === 'zh-CN')?.companyName).toBe(
      '天津大学仁爱学院',
    )
    expect(education?.translations.find((entry) => entry.locale === 'zh-CN')?.roleName).toBe(
      '本科 · 通信工程',
    )

    for (const entry of work) {
      expect(entry.endDate === null ? entry.isCurrent : true).toBe(true)
    }
  })

  it('marks exactly one experience as current and keeps valid date ranges', () => {
    const current = EXPERIENCE_SEEDS.filter((seed) => seed.isCurrent)

    expect(current).toHaveLength(1)
    expect(current[0]?.endDate).toBeNull()

    for (const seed of EXPERIENCE_SEEDS) {
      if (seed.endDate) {
        expect(new Date(seed.startDate).getTime(), seed.key).toBeLessThan(new Date(seed.endDate).getTime())
      }
    }
  })

  it('provides both locales with company, role and summary', () => {
    for (const seed of EXPERIENCE_SEEDS) {
      const locales = seed.translations.map((entry) => entry.locale).sort()

      expect(locales, seed.key).toEqual(['en-US', 'zh-CN'])

      for (const translation of seed.translations) {
        const label = `${seed.key} (${translation.locale})`

        expect(translation.companyName.length, label).toBeGreaterThan(0)
        expect(translation.roleName.length, label).toBeGreaterThan(0)
        expect(translation.roleName.length, `${label} roleName <= 200`).toBeLessThanOrEqual(200)
        expect(translation.companyName.length, `${label} companyName <= 200`).toBeLessThanOrEqual(200)
        expect(translation.summary.length, label).toBeGreaterThan(0)
        expect(translation.summary.length, `${label} summary <= 2000`).toBeLessThanOrEqual(2000)
      }
    }
  })
})

/**
 * P1-3 / P1-4：Work 01（Eson_web）的内容结构约束。
 * - 「核心工作」压缩为 5–7 条决策型描述，而不是任务清单
 * - 「工程实现」改写为技术决策说明，而不是技术栈罗列
 */
describe('content dataset — Work 01 structure (P1)', () => {
  const work01 = WORK_SEEDS.find((seed) => seed.slug === 'eson-web')

  function blockOf(content: string, heading: string, nextHeading: string): string {
    return content.split(`## ${heading}`)[1]?.split(`## ${nextHeading}`)[0] ?? ''
  }

  it('keeps the Eson_web key-work section within 5–7 decision bullets', () => {
    for (const locale of LOCALES) {
      const content = work01?.translations.find((entry) => entry.locale === locale)?.content ?? ''
      const block =
        locale === 'zh-CN'
          ? blockOf(content, '核心工作', '解决方案')
          : blockOf(content, 'Key work', 'Approach')
      const bullets = block.split('\n').filter((line) => line.startsWith('- '))

      expect(bullets.length, `${locale}: key-work bullets`).toBeGreaterThanOrEqual(5)
      expect(bullets.length, `${locale}: key-work bullets`).toBeLessThanOrEqual(7)
    }
  })

  it('never writes Work 01 as a "Technology: description" checklist', () => {
    const techPrefix =
      /^-\s*(Nuxt|Vue|TypeScript|NestJS|PostgreSQL|Prisma|Docker|Caddy|Tailwind|Pinia)\s*[:：]/m

    for (const locale of LOCALES) {
      const content = work01?.translations.find((entry) => entry.locale === locale)?.content ?? ''

      expect(content, `${locale}: tech checklist bullet`).not.toMatch(techPrefix)
    }
  })

  it('rewrites the Work 01 engineering section as rationale prose', () => {
    for (const locale of LOCALES) {
      const content = work01?.translations.find((entry) => entry.locale === locale)?.content ?? ''
      const block =
        locale === 'zh-CN'
          ? blockOf(content, '工程实现', '结果')
          : blockOf(content, 'Engineering', 'Result')
      const lines = block.split('\n').filter((line) => line.trim().length > 0)

      expect(lines.filter((line) => line.startsWith('- ')).length, `${locale}: engineering bullets`).toBe(0)
      expect(lines.length, `${locale}: engineering paragraphs`).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('content dataset — settings', () => {
  it('keeps unique keys and only factual values', () => {
    const keys = SETTING_SEEDS.map((entry) => entry.key)

    expect(new Set(keys).size).toBe(keys.length)

    const byKey = new Map(SETTING_SEEDS.map((entry) => [entry.key, entry.value]))

    expect(byKey.get('site.title')).toBe('ESON')
    expect(byKey.get('site.defaultLocale')).toBe('zh-CN')
    expect(byKey.get('site.locales')).toEqual(['zh-CN', 'en-US'])
    // 用户已确认接受合作 → 与 Hero 的「可接受合作 / Available」一致
    expect(byKey.get('site.available')).toBe(true)
    expect(byKey.get('site.email')).toBe('jikang0424@163.com')
  })
})

describe('content dataset — no fabricated facts', () => {
  it('contains no forbidden placeholder or marketing words', () => {
    for (const text of allTexts()) {
      const lower = text.toLowerCase()

      for (const word of FORBIDDEN_WORDS) {
        expect(lower, `"${word}" must not appear in: ${text.slice(0, 60)}`).not.toContain(
          word.toLowerCase(),
        )
      }
    }
  })

  it('never references accounts or links that were not provided', () => {
    for (const text of allTexts()) {
      const lower = text.toLowerCase()

      for (const term of FORBIDDEN_SOCIAL) {
        expect(lower, `"${term}" must not appear in: ${text.slice(0, 60)}`).not.toContain(term)
      }
    }
  })

  it('contains no quantified business metrics', () => {
    for (const text of allTexts()) {
      for (const pattern of FORBIDDEN_METRIC_PATTERNS) {
        expect(
          pattern.test(text),
          `metric pattern ${pattern} matched in: ${text.slice(0, 80)}`,
        ).toBe(false)
      }
    }
  })

  it('describes the education entry without inventing honours or results', () => {
    const education = EXPERIENCE_SEEDS.find((seed) => seed.key === 'experience-education-tju-2014')
    const text = education?.translations.map((entry) => `${entry.roleName} ${entry.summary}`).join(' ') ?? ''

    for (const pattern of [/GPA/i, /绩点/, /奖学金/, /荣誉/, /排名/]) {
      expect(pattern.test(text), `${pattern} must not appear in education entry`).toBe(false)
    }
  })
})

describe('deterministicUuid', () => {
  it('produces a valid, stable UUID v5 for the same seed', () => {
    const a = deterministicUuid('eson-content:experience:experience-taixin-2023')
    const b = deterministicUuid('eson-content:experience:experience-taixin-2023')

    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('produces different ids for different seeds', () => {
    expect(deterministicUuid('a')).not.toBe(deterministicUuid('b'))
  })
})
