import type { HomeContent } from '../types/content'
import { CONTACT_MAILTO } from './contact'

/**
 * 首页编辑内容（不含条目数据）。
 *
 * Work / Lab / Writing / Experience 条目来自真实 API；本文件只保存不随内容库变化的
 * 品牌文案、章节标题与稳定链接。所有状态类字段必须是可核实的事实：
 * - `availability`：用户已确认接受合作
 * - `socials`：只列真实存在的地址（GitHub / LinkedIn 未提供，因此不出现）
 *
 * 结构遵循 Translation Model（AGENTS §8、§51）：按 locale 组织，Public 缺失时回退 zh-CN。
 */

const EN: HomeContent = {
  hero: {
    kicker: 'Portfolio',
    brand: 'ESON',
    headline: ['Software', 'Engineer', '&', 'Builder'],
    lead: 'I build digital products, AI systems and interactive experiences.',
    availability: { label: 'Available', state: 'online' },
    primaryAction: { label: 'Explore selected work', to: '#work' },
  },
  intro: {
    headline: ['I build things', 'that live on', 'the web.'],
    body: 'Software engineer focused on frontend engineering, AI systems, digital products and experimentation. I care about the parts users never see: structure, performance, accessibility and the engineering discipline that keeps a product alive.',
    focusAreas: [
      'Frontend Engineering',
      'AI & Agents',
      'Digital Product',
      'Automation',
      'E-commerce',
    ],
  },
  selectedWork: {
    index: '01',
    kicker: 'Selected work',
    title: 'Selected work',
    lede: 'Case studies written as problems, decisions and outcomes — not a grid of thumbnails.',
    // Phase 3：条目由 useHomeSections() 从真实 API（/api/v1/work）注入
    items: [],
  },
  capabilities: {
    index: '02',
    kicker: 'Capabilities',
    title: 'Capabilities',
    lede: 'Four areas where I take a problem from idea to something people can actually use.',
    items: [
      {
        id: 'capability-engineering',
        title: 'Software Engineering',
        description:
          'Frontend and backend systems built with TypeScript end to end, with types, tests and clear module boundaries.',
        technologies: ['TypeScript', 'Nuxt', 'NestJS'],
      },
      {
        id: 'capability-ai',
        title: 'AI & Agents',
        description:
          'Agent workflows and LLM integrations that are measured by what they automate, not by how they demo.',
        technologies: ['LLM', 'Agents', 'Automation'],
      },
      {
        id: 'capability-product',
        title: 'Product & Interface',
        description:
          'Design systems, interaction design and interfaces that stay usable as the product grows.',
        technologies: ['Design Systems', 'Accessibility', 'Motion'],
      },
      {
        id: 'capability-commerce',
        title: 'Commerce & Automation',
        description:
          'Amazon and e-commerce operations turned into repeatable tooling, data flows and internal products.',
        technologies: ['E-commerce', 'Data', 'Tooling'],
      },
    ],
  },
  lab: {
    index: '03',
    kicker: 'Lab',
    title: 'Lab',
    lede: 'Experiments, prototypes and technical exploration — the things that are not products yet.',
    items: [],
  },
  writing: {
    index: '04',
    kicker: 'Writing',
    title: 'Writing',
    lede: 'Notes on engineering, AI systems and building products that stay maintainable.',
    items: [],
  },
  experience: {
    index: '05',
    kicker: 'Experience',
    title: 'Experience',
    lede: 'A short timeline. Detailed history belongs on the experience page.',
    items: [],
  },
  contact: {
    headline: ["Let's build", 'something.'],
    body: 'Have an idea, a product or an interesting problem? I am happy to talk about it.',
    action: { label: 'Get in touch', to: '/contact' },
    // 只有真实存在的联系方式；GitHub / LinkedIn 未提供，因此不出现（AGENTS §45）
    socials: [{ label: 'Email', href: CONTACT_MAILTO }],
  },
}

const ZH: HomeContent = {
  hero: {
    kicker: '作品集',
    brand: 'ESON',
    headline: ['Software', 'Engineer', '&', 'Builder'],
    lead: '我构建数字产品、AI 系统与交互体验。',
    availability: { label: '可接受合作', state: 'online' },
    primaryAction: { label: '查看精选作品', to: '#work' },
  },
  intro: {
    headline: ['我构建运行在', 'Web 之上的', '产品与系统。'],
    body: '软件工程师，专注前端工程、AI 系统、数字产品与实验性技术。我同样在意用户看不见的部分：结构、性能、无障碍，以及让产品长期可维护的工程纪律。',
    focusAreas: ['前端工程', 'AI 与 Agent', '数字产品', '自动化', '电商'],
  },
  selectedWork: {
    index: '01',
    kicker: '精选作品',
    title: '精选作品',
    lede: '以问题、决策与结果组织的案例，而不是一排缩略图。',
    items: [],
  },
  capabilities: {
    index: '02',
    kicker: '能力',
    title: '能力',
    lede: '四个我能够从想法推进到真正可用的方向。',
    items: [
      {
        id: 'capability-engineering',
        title: '软件工程',
        description: '以前后端一体的 TypeScript 构建系统，重视类型、测试与清晰的模块边界。',
        technologies: ['TypeScript', 'Nuxt', 'NestJS'],
      },
      {
        id: 'capability-ai',
        title: 'AI 与 Agent',
        description: '以实际自动化效果衡量价值的 Agent 流程与 LLM 集成，而不是演示效果。',
        technologies: ['LLM', 'Agent', '自动化'],
      },
      {
        id: 'capability-product',
        title: '产品与界面',
        description: '设计系统、交互设计与界面实现，让产品在长期迭代中保持可用。',
        technologies: ['设计系统', '无障碍', '动效'],
      },
      {
        id: 'capability-commerce',
        title: '电商与自动化',
        description: '把 Amazon 与电商运营沉淀为可复用的工具、数据流与内部产品。',
        technologies: ['电商', '数据', '工具链'],
      },
    ],
  },
  lab: {
    index: '03',
    kicker: '实验室',
    title: '实验室',
    lede: '实验、原型与技术探索——还不是产品，但已经在跑。',
    items: [],
  },
  writing: {
    index: '04',
    kicker: '文章',
    title: '文章',
    lede: '关于工程、AI 系统与长期可维护产品的记录。',
    items: [],
  },
  experience: {
    index: '05',
    kicker: '经历',
    title: '经历',
    lede: '一段简短的时间线，完整经历放在经历页。',
    items: [],
  },
  contact: {
    headline: ['一起构建', '一些东西。'],
    body: '如果你有想法、产品或一个有趣的问题，欢迎聊聊。',
    action: { label: '联系我', to: '/contact' },
    socials: [{ label: 'Email', href: CONTACT_MAILTO }],
  },
}

export const HOME_CONTENT: Record<'zh-CN' | 'en-US', HomeContent> = {
  'zh-CN': ZH,
  'en-US': EN,
}
