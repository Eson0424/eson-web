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

  it('uses the approved hero headline and role per locale', () => {
    // Hero 主标题已由用户确认更新（PRD §4.2 / AGENTS §45 同步更新）
    expect(HOME_CONTENT['zh-CN'].hero.headline).toEqual(['从界面，到产品。'])
    expect(HOME_CONTENT['en-US'].hero.headline).toEqual(['From interfaces to products.'])

    for (const locale of LOCALES) {
      const { hero } = HOME_CONTENT[locale]

      expect(hero.brand, locale).toBe('ESON')
      expect(hero.primaryAction.to, locale).toBe('#work')
      expect(hero.kicker.length, locale).toBeGreaterThan(0)
      expect(hero.lead.length, locale).toBeGreaterThan(0)
      // 用户已确认接受合作 → availability 必须存在（AGENTS §45：不展示未经确认的状态）
      expect(hero.availability, locale).not.toBeNull()
    }
  })

  it('states the AI-enhanced digital product developer positioning', () => {
    expect(HOME_CONTENT['zh-CN'].hero.lead).toContain('AI 增强型数字产品开发者')
    expect(HOME_CONTENT['en-US'].hero.lead).toContain('AI-Enhanced Digital Product Developer')
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

  it('ships the six approved capabilities with badges and unique ids', () => {
    for (const locale of LOCALES) {
      const items = HOME_CONTENT[locale].capabilities.items

      expect(items.length, locale).toBe(6)
      expect(new Set(items.map((item) => item.id)).size, locale).toBe(items.length)

      for (const item of items) {
        expect(item.title.length, `${locale}: ${item.id}`).toBeGreaterThan(0)
        expect(item.description.length, `${locale}: ${item.id}`).toBeGreaterThan(0)
        expect(item.technologies.length, `${locale}: ${item.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('never advertises skills as percentages', () => {
    for (const locale of LOCALES) {
      const serialized = JSON.stringify(HOME_CONTENT[locale])

      expect(serialized, locale).not.toMatch(/\d+\s*%/)
    }
  })

  it('exposes only the real contact channel and no fabricated content', () => {
    const forbidden = ['github', 'linkedin', '占位', '尚未发布', '下一阶段', 'placeholder', 'lorem']

    for (const locale of LOCALES) {
      const content = HOME_CONTENT[locale]

      expect(content.contact.socials.map((social) => social.label), locale).toEqual(['Email'])
      expect(content.contact.socials[0]?.href, locale).toBe('mailto:jikang0424@163.com')

      const serialized = JSON.stringify(content).toLowerCase()

      for (const phrase of forbidden) {
        expect(serialized, `${locale}: ${phrase}`).not.toContain(phrase)
      }
    }
  })
})
