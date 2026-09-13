import type { AboutContent } from '../types/about'

/**
 * About 页面内容（Phase 2C-3）。
 *
 * 这里描述的是品牌定位、工作方式与能力分类，不包含等级、年限、认证、客户或任何量化成果。
 * 当前关注方向尚无真实内容，因此 `focus.placeholder = true`，页面会明确提示。
 */

const EN: AboutContent = {
  hero: {
    kicker: 'About',
    brand: 'ESON',
    headline: ['Software engineer', 'and builder.'],
    lead: 'I design and build digital products end to end: interface, systems and the engineering process that keeps them alive. This site is part of that work — built in documented phases, not assembled from a template.',
  },
  profile: {
    title: 'Profile',
    lede: 'Six areas I keep coming back to.',
    areas: [
      {
        id: 'profile-software-engineering',
        label: 'Software Engineering',
        description: 'Typed, tested systems with clear module boundaries and honest error handling.',
      },
      {
        id: 'profile-ai-agents',
        label: 'AI & Agents',
        description: 'Agent workflows and LLM integrations judged by what they automate, not by how they demo.',
      },
      {
        id: 'profile-product',
        label: 'Product Development',
        description: 'Turning an unclear problem into a scope that can actually ship.',
      },
      {
        id: 'profile-interaction',
        label: 'Interaction & Frontend',
        description: 'Interfaces, design systems and motion that explain hierarchy instead of decorating.',
      },
      {
        id: 'profile-commerce',
        label: 'Amazon & E-commerce',
        description: 'Operations, data and tooling for commerce that has to work every day.',
      },
      {
        id: 'profile-experiment',
        label: 'Experiment & Building',
        description: 'Prototypes and technical exploration — the Lab is where those live.',
      },
    ],
  },
  philosophy: {
    title: 'Engineering philosophy',
    lede: 'Four words that describe how the work actually happens.',
    principles: [
      {
        id: 'build',
        title: 'Build',
        body: 'Start from the real problem and the smallest thing that can be verified. Structure follows evidence, not enthusiasm.',
      },
      {
        id: 'think',
        title: 'Think',
        body: 'Decisions get written down: why this stack, why this boundary, what was rejected. A decision without a reason is a future bug.',
      },
      {
        id: 'ship',
        title: 'Ship',
        body: 'Work is finished when it is deployed, accessible and measured — typechecks and tests passing are the entry fee, not the goal.',
      },
      {
        id: 'iterate',
        title: 'Iterate',
        body: 'Every phase ends with a review and a smaller next step. Refactoring is planned work, not a rescue mission.',
      },
    ],
  },
  capabilities: {
    title: 'Capabilities',
    lede: 'Areas of work, not a skills scoreboard — no levels or years are listed.',
    items: [
      {
        id: 'capability-frontend',
        title: 'Frontend',
        description: 'Component architecture, design systems, accessibility and rendering decisions.',
        technologies: ['Vue', 'Nuxt', 'TypeScript', 'Tailwind CSS'],
      },
      {
        id: 'capability-ai',
        title: 'AI / AI Agent',
        description: 'Agent workflows, tool use, evaluation and integration into real product flows.',
        technologies: ['LLM', 'Agents', 'TypeScript'],
      },
      {
        id: 'capability-product-engineering',
        title: 'Product Engineering',
        description: 'From requirements and data model to a shipped, maintainable feature.',
        technologies: ['Nuxt', 'NestJS', 'PostgreSQL'],
      },
      {
        id: 'capability-interaction',
        title: 'Interaction',
        description: 'Interface behaviour, motion systems and reduced-motion safe implementation.',
        technologies: ['CSS', 'GSAP', 'Motion'],
      },
      {
        id: 'capability-ecommerce',
        title: 'E-commerce',
        description: 'Commerce operations and the tooling that supports them.',
        technologies: ['Data', 'Automation'],
      },
      {
        id: 'capability-automation',
        title: 'Automation',
        description: 'Removing repetitive work with reliable scripts, jobs and internal tools.',
        technologies: ['Node.js', 'CLI', 'APIs'],
      },
      {
        id: 'capability-system-design',
        title: 'System Design',
        description: 'API contracts, data modelling and boundaries that survive growth.',
        technologies: ['REST', 'Prisma', 'PostgreSQL'],
      },
    ],
  },
  focus: {
    title: 'Current focus',
    lede: 'What I am working on right now.',
    items: [],
    placeholder: true,
  },
  cta: {
    title: 'Where to go next',
    lede: 'The work, the experiments and the writing are all on this site.',
    actions: [
      { label: 'Work', to: '/work' },
      { label: 'Lab', to: '/lab' },
      { label: 'Writing', to: '/writing' },
      { label: 'Contact', to: '/contact' },
    ],
  },
}

const ZH: AboutContent = {
  hero: {
    kicker: '关于',
    brand: 'ESON',
    headline: ['软件工程师', '与构建者。'],
    lead: '我端到端设计与构建数字产品：界面、系统，以及让它们能长期存活下去的工程流程。这个网站本身就是其中一个作品——按文档分阶段构建，而不是拼装模板。',
  },
  profile: {
    title: '定位',
    lede: '六个我反复回到的方向。',
    areas: [
      {
        id: 'profile-software-engineering',
        label: '软件工程',
        description: '类型完备、经过测试的系统，模块边界清晰，错误处理诚实。',
      },
      {
        id: 'profile-ai-agents',
        label: 'AI 与 Agent',
        description: '以真正自动化了什么来衡量 Agent 工作流与 LLM 集成，而不是看演示效果。',
      },
      {
        id: 'profile-product',
        label: '产品开发',
        description: '把模糊的问题收敛成一个真正能交付的范围。',
      },
      {
        id: 'profile-interaction',
        label: '交互与前端',
        description: '界面、设计系统，以及用来解释层级而不是装饰的动效。',
      },
      {
        id: 'profile-commerce',
        label: 'Amazon 与电商',
        description: '面向每天都必须正常运转的电商业务：运营、数据与工具。',
      },
      {
        id: 'profile-experiment',
        label: '实验与构建',
        description: '原型与技术探索，它们都放在 Lab 里。',
      },
    ],
  },
  philosophy: {
    title: '工程理念',
    lede: '四个词描述这份工作真实发生的方式。',
    principles: [
      {
        id: 'build',
        title: 'Build',
        body: '从真实问题出发，先做能被验证的最小部分。结构由证据决定，而不是由热情决定。',
      },
      {
        id: 'think',
        title: 'Think',
        body: '决策要写下来：为什么选这个技术、为什么划这条边界、放弃了什么。没有理由的决策就是未来的 Bug。',
      },
      {
        id: 'ship',
        title: 'Ship',
        body: '工作完成的标准是已部署、可访问、可衡量；类型检查与测试通过只是入场券，不是目标。',
      },
      {
        id: 'iterate',
        title: 'Iterate',
        body: '每个阶段以复盘和更小的下一步收尾。重构是计划内的工作，而不是救火。',
      },
    ],
  },
  capabilities: {
    title: '能力范围',
    lede: '这里描述工作范围，不是技能评分表——不列等级，也不列年限。',
    items: [
      {
        id: 'capability-frontend',
        title: '前端工程',
        description: '组件架构、设计系统、无障碍与渲染策略。',
        technologies: ['Vue', 'Nuxt', 'TypeScript', 'Tailwind CSS'],
      },
      {
        id: 'capability-ai',
        title: 'AI / Agent',
        description: 'Agent 工作流、工具调用、评估，以及接入真实产品流程。',
        technologies: ['LLM', 'Agent', 'TypeScript'],
      },
      {
        id: 'capability-product-engineering',
        title: '产品工程',
        description: '从需求与数据模型，到可以交付且可维护的功能。',
        technologies: ['Nuxt', 'NestJS', 'PostgreSQL'],
      },
      {
        id: 'capability-interaction',
        title: '交互实现',
        description: '界面行为、动效系统，以及对 reduced motion 安全的实现。',
        technologies: ['CSS', 'GSAP', '动效'],
      },
      {
        id: 'capability-ecommerce',
        title: '电商实践',
        description: '电商运营，以及支撑它们的工具。',
        technologies: ['数据', '自动化'],
      },
      {
        id: 'capability-automation',
        title: '自动化',
        description: '用可靠的脚本、任务与内部工具消除重复劳动。',
        technologies: ['Node.js', 'CLI', '接口'],
      },
      {
        id: 'capability-system-design',
        title: '系统设计',
        description: '能随规模演进的 API 契约、数据建模与边界划分。',
        technologies: ['REST', 'Prisma', 'PostgreSQL'],
      },
    ],
  },
  focus: {
    title: '当前关注',
    lede: '我现在正在做的事情。',
    items: [],
    placeholder: true,
  },
  cta: {
    title: '接下来',
    lede: '作品、实验与文章都在这个站点上。',
    actions: [
      { label: '作品', to: '/work' },
      { label: '实验室', to: '/lab' },
      { label: '文章', to: '/writing' },
      { label: '联系', to: '/contact' },
    ],
  },
}

export const ABOUT_CONTENT: Record<'zh-CN' | 'en-US', AboutContent> = {
  'zh-CN': ZH,
  'en-US': EN,
}
