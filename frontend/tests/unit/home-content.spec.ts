import { describe, expect, it } from 'vitest'
import { HOME_CONTENT } from '../../app/data/home'

// Phase 2B：首页内容契约。
// 接入真实 API 后，这些断言同样适用于 API 返回值（保持 Section 组件的输入形状稳定）。

const LOCALES = ['zh-CN', 'en-US'] as const
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('home content contract', () => {
  it('ships exactly the approved locales', () => {
    expect(Object.keys(HOME_CONTENT).sort()).toEqual(['en-US', 'zh-CN'])
  })

  it('keeps the fixed brand headline in every locale', () => {
    for (const locale of LOCALES) {
      const { hero } = HOME_CONTENT[locale]

      expect(hero.brand).toBe('ESON')
      expect(hero.headline).toEqual(['Software', 'Engineer', '&', 'Builder'])
      expect(hero.primaryAction.to).toBe('#work')
    }
  })

  it('provides section chrome for every homepage section', () => {
    for (const locale of LOCALES) {
      const content = HOME_CONTENT[locale]

      // 条目现在来自 API；这里只校验编辑内容（编号 / 标题）完整性
      for (const section of [
        content.selectedWork,
        content.capabilities,
        content.lab,
        content.writing,
        content.experience,
      ]) {
        expect(section.index.length, locale).toBeGreaterThan(0)
        expect(section.title.length, locale).toBeGreaterThan(0)
      }

      expect(content.capabilities.items.length, locale).toBeGreaterThan(0)
    }
  })

  it('uses unique, URL-safe slugs for routable content', () => {
    for (const locale of LOCALES) {
      const content = HOME_CONTENT[locale]
      const slugs = [
        ...content.selectedWork.items.map((work) => work.slug),
        ...content.lab.items.map((experiment) => experiment.slug),
        ...content.writing.items.map((article) => article.slug),
      ]

      for (const slug of slugs) {
        expect(slug, `${locale}: ${slug}`).toMatch(SLUG_PATTERN)
      }

      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('provides the fields the section components render', () => {
    for (const locale of LOCALES) {
      const content = HOME_CONTENT[locale]

      for (const work of content.selectedWork.items) {
        expect(work.title.length).toBeGreaterThan(0)
        expect(work.summary.length).toBeGreaterThan(0)
        expect(work.categories.length).toBeGreaterThan(0)
      }

      for (const experiment of content.lab.items) {
        expect(experiment.status.length).toBeGreaterThan(0)
        expect(experiment.summary.length).toBeGreaterThan(0)
      }

      for (const article of content.writing.items) {
        expect(article.readingTimeMinutes).toBeGreaterThan(0)
        expect(article.categories.length).toBeGreaterThan(0)
        expect(article.excerpt.length).toBeGreaterThan(0)
      }

      for (const entry of content.experience.items) {
        expect(entry.title.length).toBeGreaterThan(0)
        expect(entry.summary.length).toBeGreaterThan(0)

        if (entry.current) {
          expect(entry.endDate ?? null).toBeNull()
        }
      }
    }
  })
})
