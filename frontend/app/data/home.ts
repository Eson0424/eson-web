import type { HomeContent } from '../types/content'
import { CONTACT_MAILTO } from './contact'

/**
 * 首页编辑内容（不含条目数据）。
 *
 * Work / Lab / Writing / Experience 条目来自真实 API；本文件只保存不随内容库变化的
 * 品牌文案、章节标题与稳定链接。所有状态类字段必须是可核实的事实：
 * - `availability`：用户已确认接受合作
 * - `socials`：只列真实存在的地址（GitHub / LinkedIn 未提供，因此不出现）
 * - Hero 主标题：`从界面，到产品。` / `From interfaces to products.`
 *   （用户确认的新定位，PRD §4.2 与 AGENTS §45 已同步更新）
 *
 * 结构遵循 Translation Model（AGENTS §8、§51）：按 locale 组织，Public 缺失时回退 zh-CN。
 */

const EN: HomeContent = {
  hero: {
    kicker: 'Portfolio',
    brand: 'ESON',
    headline: ['From interfaces to products.'],
    lead: 'AI-Enhanced Digital Product Developer. Starting from frontend engineering and moving into full-stack products, AI tooling, e-commerce operations and AIGC workflows.',
    availability: { label: 'Available', state: 'online' },
    primaryAction: { label: 'View selected work', to: '#work' },
  },
  intro: {
    headline: ['I build things', 'that live on', 'the web.'],
    body: 'I am a software developer with years of experience in web development and independent product delivery. Starting from frontend work, I gradually moved into full-stack products, AI tooling, e-commerce operations and AIGC workflows. What matters to me is not only getting an interface built, but taking a real problem from an idea to something that runs, can be used and keeps improving.',
    focusAreas: [
      'Frontend Engineering',
      'Full-stack Development',
      'AI & Automation',
      'AIGC Workflow',
      'E-commerce',
    ],
  },
  selectedWork: {
    index: '01',
    kicker: 'Selected work',
    title: 'Selected work',
    lede: 'Products and experiments I am building, using and continuously evolving.',
    // 条目由 useHomeSections() 从真实 API（/api/v1/work）注入
    items: [],
  },
  capabilities: {
    index: '02',
    kicker: 'Capabilities',
    title: 'What I do',
    lede: 'Six areas I take from a problem to something that actually runs.',
    items: [
      {
        id: 'capability-product-development',
        title: 'Product Development',
        description:
          'Taking a web product from structure and interface design through frontend, backend and production deployment.',
        technologies: ['Nuxt', 'NestJS', 'PostgreSQL'],
      },
      {
        id: 'capability-frontend',
        title: 'Frontend Engineering',
        description:
          'Vue and Nuxt with TypeScript, covering responsive websites, H5 applications and admin systems.',
        technologies: ['Vue', 'Nuxt', 'TypeScript'],
      },
      {
        id: 'capability-fullstack',
        title: 'Full-stack Development',
        description:
          'Extending beyond the frontend into APIs, databases, authentication and Docker-based deployment.',
        technologies: ['NestJS', 'Prisma', 'Docker'],
      },
      {
        id: 'capability-ai-automation',
        title: 'AI & Automation',
        description:
          'Applying AI in software products, e-commerce analysis and content production workflows.',
        technologies: ['AI', 'LLM', 'Automation'],
      },
      {
        id: 'capability-aigc',
        title: 'AIGC Workflow',
        description:
          'Building reusable ComfyUI workflows for image generation, processing and batch production.',
        technologies: ['ComfyUI', 'ControlNet', 'LoRA'],
      },
      {
        id: 'capability-ecommerce',
        title: 'E-commerce',
        description:
          'Hands-on Amazon US marketplace experience, turning operational problems into software tools.',
        technologies: ['Amazon', 'Data Analysis', 'Listing'],
      },
    ],
  },
  lab: {
    index: '03',
    kicker: 'Lab',
    title: 'Lab',
    lede: 'Where I research and practise: the intersection of AI, AIGC, ComfyUI, automation and software products.',
    items: [],
  },
  writing: {
    index: '04',
    kicker: 'Writing',
    title: 'Writing',
    lede: 'Notes from independent development, AI, products, e-commerce and engineering practice.',
    items: [],
  },
  experience: {
    index: '05',
    kicker: 'Experience',
    title: 'Experience',
    lede: 'From frontend engineering to independent development, real-world business and AI product practice.',
    items: [],
  },
  contact: {
    headline: ['Have a project', 'in mind?'],
    body: 'If you are building a web product, need frontend or full-stack development, or are exploring practical applications of AI, I would be glad to hear from you.',
    action: { label: 'Get in touch', to: '/contact' },
    // 只有真实存在的联系方式；GitHub / LinkedIn 未提供，因此不出现（AGENTS §45）
    socials: [{ label: 'Email', href: CONTACT_MAILTO }],
  },
}

const ZH: HomeContent = {
  hero: {
    kicker: '作品集',
    brand: 'ESON',
    headline: ['从界面，到产品。'],
    lead: 'AI 增强型数字产品开发者。从前端开发出发，逐步延伸到全栈产品、AI 工具、电商业务与 AIGC 工作流。',
    availability: { label: '可接受合作', state: 'online' },
    primaryAction: { label: '查看精选作品', to: '#work' },
  },
  intro: {
    headline: ['我构建运行在', 'Web 之上的', '产品与系统。'],
    body: '我是一名拥有多年软件开发与独立产品交付经验的开发者。从前端开发出发，逐步延伸到全栈产品、AI 工具、电商业务与 AIGC 工作流。我关注的不只是把页面做出来，而是把一个真实的问题，从想法推进到可以运行、可以使用、可以持续迭代的产品。',
    focusAreas: ['前端工程', '全栈开发', 'AI 与自动化', 'AIGC 工作流', '电商'],
  },
  selectedWork: {
    index: '01',
    kicker: '精选作品',
    title: '精选作品',
    lede: '一些我正在构建、使用和持续迭代的真实项目。',
    items: [],
  },
  capabilities: {
    index: '02',
    kicker: '能力',
    title: '我可以做什么',
    lede: '六个我能够从问题推进到真正可运行的方向。',
    items: [
      {
        id: 'capability-product-development',
        title: '产品开发',
        description: '从产品结构与页面设计，到前后端实现与生产部署，独立完成完整 Web 产品。',
        technologies: ['Nuxt', 'NestJS', 'PostgreSQL'],
      },
      {
        id: 'capability-frontend',
        title: '前端工程',
        description: '以 Vue / Nuxt / TypeScript 为核心，覆盖响应式网站、H5 与后台管理系统。',
        technologies: ['Vue', 'Nuxt', 'TypeScript'],
      },
      {
        id: 'capability-fullstack',
        title: '全栈开发',
        description: '从前端延伸到 API、数据库、认证与 Docker 部署，对完整交付负责。',
        technologies: ['NestJS', 'Prisma', 'Docker'],
      },
      {
        id: 'capability-ai-automation',
        title: 'AI 与自动化',
        description: '把 AI 应用到软件产品、电商数据分析与内容生产流程中。',
        technologies: ['AI', 'LLM', '自动化'],
      },
      {
        id: 'capability-aigc',
        title: 'AIGC 工作流',
        description: '使用 ComfyUI 构建可复用的图像生成、处理与批量生产工作流。',
        technologies: ['ComfyUI', 'ControlNet', 'LoRA'],
      },
      {
        id: 'capability-ecommerce',
        title: '电商',
        description: '具备 Amazon US 实际运营经验，并把业务问题转化为软件工具。',
        technologies: ['Amazon', '数据分析', 'Listing'],
      },
    ],
  },
  lab: {
    index: '03',
    kicker: '实验室',
    title: '实验室',
    lede: '这里记录我正在研究和实践的技术，重点关注 AI、AIGC、ComfyUI、自动化与软件产品之间的结合。',
    items: [],
  },
  writing: {
    index: '04',
    kicker: '文章',
    title: '文章',
    lede: '记录我在独立开发、AI、产品、电商与技术实践中的一些思考。',
    items: [],
  },
  experience: {
    index: '05',
    kicker: '经历',
    title: '经历',
    lede: '从前端工程，到独立开发，再到真实业务与 AI 产品实践。',
    items: [],
  },
  contact: {
    headline: ['有项目，', '或者只是想聊聊？'],
    body: '如果你正在构建一个 Web 产品、需要前端或全栈开发，或者正在探索 AI 在实际业务中的应用，欢迎联系我。',
    action: { label: '发送消息', to: '/contact' },
    socials: [{ label: 'Email', href: CONTACT_MAILTO }],
  },
}

export const HOME_CONTENT: Record<'zh-CN' | 'en-US', HomeContent> = {
  'zh-CN': ZH,
  'en-US': EN,
}
