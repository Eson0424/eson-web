import { describe, expect, it } from 'vitest'
import { ABOUT_CONTENT } from '../../app/data/about'

// Phase 2C-3：About 内容契约。

const LOCALES = ['zh-CN', 'en-US'] as const
const FORBIDDEN_CAPABILITY_FIELDS = ['level', 'years', 'experience', 'certification', 'score']

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

  it('keeps the current focus explicitly marked as placeholder', () => {
    for (const locale of LOCALES) {
      const focus = ABOUT_CONTENT[locale].focus

      expect(focus.placeholder, locale).toBe(true)
      expect(focus.items, locale).toEqual([])
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
