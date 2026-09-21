/**
 * About 页面内容模型。
 *
 * About 属于个人品牌内容，不属于 DATABASE 中的核心内容类型；
 * 未来将由 SiteSetting / Person 类内容承载（docs/ARCHITECTURE.md §31），
 * 因此这里只定义渲染需要的形状，不引入与未来 API 冲突的字段。
 */
export interface AboutHeroContent {
  kicker: string
  brand: string
  headline: string[]
  lead: string
}

export interface AboutProfileArea {
  id: string
  label: string
  description: string
}

export interface AboutProfileContent {
  title: string
  lede?: string
  areas: AboutProfileArea[]
}

export interface AboutPhilosophyPrinciple {
  id: string
  title: string
  body: string
}

export interface AboutPhilosophyContent {
  title: string
  lede?: string
  principles: AboutPhilosophyPrinciple[]
}

export interface AboutCapability {
  id: string
  title: string
  description: string
  technologies: string[]
}

export interface AboutCapabilitiesContent {
  title: string
  lede?: string
  items: AboutCapability[]
}

export interface AboutCtaContent {
  title: string
  lede?: string
  actions: Array<{ label: string; to: string }>
}

export interface AboutContent {
  hero: AboutHeroContent
  profile: AboutProfileContent
  philosophy: AboutPhilosophyContent
  capabilities: AboutCapabilitiesContent
  cta: AboutCtaContent
}
