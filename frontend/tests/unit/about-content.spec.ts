import { describe, expect, it } from 'vitest'
import { ABOUT_CONTENT } from '../../app/data/about'

// Phase 2C-3：About 内容契约。

const LOCALES = ['zh-CN', 'en-US'] as const
const FORBIDDEN_CAPABILITY_FIELDS = ['level', 'years', 'experience', 'certification', 'score']

/** 用户确认的 7 个技能分类（顺序即展示顺序） */
const SKILL_IDS = [
  'skill-frontend',
  'skill-backend',
  'skill-product-engineering',
  'skill-ai-aigc',
  'skill-ecommerce',
  'skill-design-content',
  'skill-engineering-practices',
]

describe('about content contract', () => {
  it('ships both locales with the same section structure', () => {
    for (const locale of LOCALES) {
      const content = ABOUT_CONTENT[locale]

      expect(content.hero.headline.length, locale).toBeGreaterThan(0)
      expect(content.hero.lead.length, locale).toBeGreaterThan(0)
      expect(content.profile.areas.length, locale).toBeGreaterThan(0)
      expect(content.philosophy.principles.length, locale).toBeGreaterThan(0)
      expect(content.capabilities.items.length, locale).toBeGreaterThan(0)
      expect(content.cta.actions.length, locale).toBeGreaterThan(0)
    }
  })

  it('does not claim levels, years or certifications for any capability', () => {
    for (const locale of LOCALES) {
      for (const item of ABOUT_CONTENT[locale].capabilities.items) {
        for (const field of FORBIDDEN_CAPABILITY_FIELDS) {
          expect(Object.keys(item), `${locale}: ${item.id}`).not.toContain(field)
        }

        expect(item.title.length, item.id).toBeGreaterThan(0)
        expect(item.description.length, item.id).toBeGreaterThan(0)
      }
    }
  })

  it('ships the seven approved skill categories with technology lists', () => {
    for (const locale of LOCALES) {
      const items = ABOUT_CONTENT[locale].capabilities.items

      expect(items.map((item) => item.id), locale).toEqual(SKILL_IDS)

      for (const item of items) {
        expect(item.technologies.length, `${locale}: ${item.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('never expresses skills as percentages', () => {
    for (const locale of LOCALES) {
      expect(JSON.stringify(ABOUT_CONTENT[locale].capabilities), locale).not.toMatch(/\d+\s*%/)
    }
  })

  it('states the approved positioning and the current-focus principle', () => {
    expect(ABOUT_CONTENT['zh-CN'].hero.headline.join('')).toContain('AI 增强型')
    expect(ABOUT_CONTENT['en-US'].hero.headline.join(' ')).toContain('AI-Enhanced')

    for (const locale of LOCALES) {
      const focus = ABOUT_CONTENT[locale].philosophy.principles.find(
        (principle) => principle.id === 'principle-now',
      )

      expect(focus, `${locale}: current focus must live in philosophy`).toBeDefined()
      expect(focus?.title.length, locale).toBeGreaterThan(0)
      expect(focus?.body.length, `${locale}: current focus body`).toBeGreaterThan(40)
    }
  })

  it('describes the six-step trajectory from frontend to products', () => {
    for (const locale of LOCALES) {
      const ids = ABOUT_CONTENT[locale].profile.areas.map((area) => area.id)

      expect(ids, locale).toEqual([
        'trajectory-frontend',
        'trajectory-ecommerce',
        'trajectory-independent',
        'trajectory-amazon',
        'trajectory-ai',
        'trajectory-products',
      ])
    }
  })

  it('ships no empty placeholder section for unpublished content', () => {
    const forbidden = ['尚未发布', 'not been published', 'placeholder', '占位', '下一阶段', 'next phase']

    for (const locale of LOCALES) {
      const serialized = JSON.stringify(ABOUT_CONTENT[locale]).toLowerCase()

      for (const phrase of forbidden) {
        expect(serialized, `${locale}: ${phrase}`).not.toContain(phrase)
      }
    }
  })

  it('links the CTA to existing internal routes only', () => {
    const allowedRoutes = ['/work', '/lab', '/writing', '/contact']

    for (const locale of LOCALES) {
      for (const action of ABOUT_CONTENT[locale].cta.actions) {
        expect(allowedRoutes, `${locale}: ${action.to}`).toContain(action.to)
      }
    }
  })

  it('uses unique ids inside every collection', () => {
    for (const locale of LOCALES) {
      const content = ABOUT_CONTENT[locale]
      const ids = [
        ...content.profile.areas.map((area) => area.id),
        ...content.philosophy.principles.map((principle) => principle.id),
        ...content.capabilities.items.map((item) => item.id),
      ]

      expect(new Set(ids).size, locale).toBe(ids.length)
    }
  })
})
