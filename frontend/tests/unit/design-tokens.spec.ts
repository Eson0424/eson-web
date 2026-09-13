import { describe, expect, it } from 'vitest'
import baseCss from '../../app/assets/css/base.css?raw'
import motionCss from '../../app/assets/css/motion.css?raw'
import tokensCss from '../../app/assets/css/tokens.css?raw'
import typographyCss from '../../app/assets/css/typography.css?raw'

// Phase 2A：设计令牌必须与 docs/DESIGN.md 一致，避免组件内硬编码设计值。

function readToken(css: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)

  if (!match?.[1]) {
    throw new Error(`Token --${name} not found in tokens.css`)
  }

  return match[1]
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  )

  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )
  const [lighter = 1, darker = 0] = luminances

  return (lighter + 0.05) / (darker + 0.05)
}

describe('design tokens', () => {
  it('declares the DESIGN §3 background surfaces', () => {
    for (const value of ['#07080c', '#0b0d12', '#10131a', '#141820']) {
      expect(tokensCss).toContain(value)
    }
  })

  it('keeps every text token at WCAG AA contrast on all surfaces', () => {
    const backgrounds = ['color-background', 'color-surface', 'color-surface-elevated']

    for (const token of ['color-ink', 'color-ink-secondary', 'color-ink-muted']) {
      for (const background of backgrounds) {
        const ratio = contrastRatio(
          readToken(tokensCss, token),
          readToken(tokensCss, background),
        )

        expect(ratio, `${token} on ${background} → ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('declares the DESIGN §9 radius scale', () => {
    for (const value of ['6px', '10px', '16px']) {
      expect(tokensCss).toContain(value)
    }
  })

  it('declares the DESIGN §26 motion durations', () => {
    for (const value of ['160ms', '260ms', '460ms', '800ms']) {
      expect(tokensCss).toContain(value)
    }
  })

  it('declares the DESIGN §37 breakpoints and §7.1 container width', () => {
    expect(tokensCss).toContain('--breakpoint-tablet: 40rem')
    expect(tokensCss).toContain('--breakpoint-desktop: 64rem')
    expect(tokensCss).toContain('--breakpoint-wide: 90rem')
    expect(tokensCss).toContain('--container-page: 90rem')
    expect(tokensCss).toContain('--container-reading: 47.5rem')
  })

  it('declares the stacking order tokens instead of magic numbers', () => {
    expect(tokensCss).toContain('--z-header')
    expect(tokensCss).toContain('--z-overlay')
    expect(tokensCss).toContain('--z-modal')
  })
})

describe('typography and motion foundation', () => {
  it('exposes the full type scale as classes', () => {
    for (const className of [
      '.type-display',
      '.type-h1',
      '.type-h2',
      '.type-h3',
      '.type-body',
      '.type-small',
      '.type-meta',
    ]) {
      expect(typographyCss).toContain(className)
    }
  })

  it('adjusts line height for Chinese typography', () => {
    expect(typographyCss).toContain("html[lang^='zh']")
  })

  it('defines page transition and reveal hooks', () => {
    expect(motionCss).toContain('.page-enter-active')
    expect(motionCss).toContain('.page-leave-active')
    expect(motionCss).toContain('.reveal')
  })

  it('disables non-essential motion when reduced motion is requested', () => {
    expect(baseCss).toContain('prefers-reduced-motion: reduce')
  })
})
