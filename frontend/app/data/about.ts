import type { AboutContent } from '../types/about'

/**
 * About 页面内容。
 *
 * 定位：AI 增强型数字产品开发者（AI-Enhanced Digital Product Developer）。
 * 叙事主线：Frontend → E-commerce → Independent Development → Amazon → AI → Products。
 *
 * 事实约束（AGENTS §45、§51）：
 * - 不写等级、年限、认证、客户、营收或任何无法验证的评价（"行业顶尖/资深专家/首席"等）。
 * - Skills 只列技术栈与实际经验分类，不使用百分比。
 * - 「现在正在做什么」按用户确认方案并入 philosophy（不新增 UI Section，不恢复 AboutFocus）。
 */

const EN: AboutContent = {
  hero: {
    kicker: 'About',
    brand: 'ESON',
    headline: ['AI-Enhanced', 'Digital Product Developer.'],
    lead: 'I am a software developer. I started focused on frontend work, building web products, admin systems and cross-border e-commerce sites with Vue and related tools. Over time I became more interested in the questions around the interface: why a product is shaped this way, how data should be organised, how the API should be designed, what it actually takes to launch a feature, and how to keep it maintainable afterwards.',
  },
  profile: {
    title: 'Trajectory',
    lede: 'How the work moved from interfaces towards products.',
    areas: [
      {
        id: 'trajectory-frontend',
        label: 'Frontend Engineering',
        description:
          'Building web products, admin systems and responsive interfaces, mainly with Vue and TypeScript.',
      },
      {
        id: 'trajectory-ecommerce',
        label: 'E-commerce',
        description: 'Working inside cross-border e-commerce, meeting real product, operations and data problems.',
      },
      {
        id: 'trajectory-independent',
        label: 'Independent Development',
        description: 'Building frontend, backend, database and deployment on my own, and owning the outcome.',
      },
      {
        id: 'trajectory-amazon',
        label: 'Amazon Marketplace',
        description:
          'Operating an Amazon US private-label store: product selection, procurement, listing, advertising and data analysis.',
      },
      {
        id: 'trajectory-ai',
        label: 'AI & AIGC',
        description:
          'Applying AI to e-commerce analysis and content production, and building image generation and processing workflows in ComfyUI.',
      },
      {
        id: 'trajectory-products',
        label: 'Digital Products',
        description:
          'Working at the intersection of software, business and AI, and taking problems all the way to something that runs.',
      },
    ],
  },
  philosophy: {
    title: 'How I work',
    lede: 'Principles I actually follow, plus what I am working on right now.',
    principles: [
      {
        id: 'principle-problem',
        title: 'Start from the problem',
        body: 'Understand the problem that needs solving first, instead of deciding on a technology first.',
      },
      {
        id: 'principle-runnable',
        title: 'Get to something runnable',
        body: 'Use sensible technical choices to turn an idea into something that can be verified as early as possible.',
      },
      {
        id: 'principle-quality',
        title: 'Keep engineering quality',
        body: 'Architecture, type safety, tests, performance, maintainability and production deployment all count as part of the work.',
      },
      {
        id: 'principle-iterate',
        title: 'Iterate',
        body: 'Launching is not the end of a product; it is the start of the next round of problems to discover.',
      },
      {
        id: 'principle-now',
        title: 'What I am working on now',
        body: 'Continuously developing and maintaining Eson_web; building Amazon-AI; operating an Amazon US marketplace store; exploring AI and AIGC; practising ComfyUI workflows; and looking for the intersection between real business problems and software products.',
      },
    ],
  },
  capabilities: {
    title: 'Skills',
    lede: 'Areas of work and technology, not a scoreboard.',
    items: [
      {
        id: 'skill-frontend',
        title: 'Frontend',
        description:
          'Vue and Nuxt with TypeScript across responsive websites, H5 applications and admin systems.',
        technologies: [
          'Vue 2',
          'Vue 3',
          'Nuxt 4',
          'TypeScript',
          'JavaScript',
          'Pinia',
          'Vue Router',
          'Tailwind CSS',
          'Vite',
          'Responsive Web',
          'H5',
          'Admin Systems',
        ],
      },
      {
        id: 'skill-backend',
        title: 'Backend',
        description: 'APIs, authentication, database design and data modelling.',
        technologies: [
          'NestJS',
          'Node.js',
          'Prisma',
          'PostgreSQL',
          'REST API',
          'Authentication',
          'JWT',
          'Database Design',
        ],
      },
      {
        id: 'skill-product-engineering',
        title: 'Product Engineering',
        description: 'From requirements to production: CMS, API design and deployment.',
        technologies: [
          'Full-stack Development',
          'CMS',
          'API Design',
          'Database Modeling',
          'Docker',
          'Docker Compose',
          'Caddy',
          'Production Deployment',
          'Testing',
        ],
      },
      {
        id: 'skill-ai-aigc',
        title: 'AI / AIGC',
        description: 'Applying AI in products and building reusable generation workflows.',
        technologies: [
          'AI / LLM',
          'ComfyUI',
          'ControlNet',
          'LoRA',
          'IPAdapter',
          'Image-to-Image',
          'Text-to-Image',
          'Inpainting',
          'Batch Generation',
          'AI Workflow Design',
        ],
      },
      {
        id: 'skill-ecommerce',
        title: 'E-commerce',
        description: 'Hands-on Amazon US marketplace operations and the tooling around them.',
        technologies: [
          'Amazon US Marketplace',
          'Listing',
          'Advertising',
          'Product Data Analysis',
          'Search Terms Analysis',
          'Keyword Analysis',
          'E-commerce Workflow',
        ],
      },
      {
        id: 'skill-design-content',
        title: 'Design & Content',
        description: 'Interface design and the visual assets a product needs.',
        technologies: [
          'UI / UX',
          'Product Visuals',
          'Photoshop',
          'Jimeng AI',
          'JianYing',
          'AIGC Visual Production',
        ],
      },
      {
        id: 'skill-engineering-practices',
        title: 'Engineering Practices',
        description: 'The habits that keep a project maintainable after launch.',
        technologies: [
          'TypeScript-first development',
          'Component-based architecture',
          'Responsive design',
          'Accessibility',
          'SEO',
          'Automated testing',
          'Production deployment',
        ],
      },
    ],
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
    headline: ['AI 增强型', '数字产品开发者。'],
    lead: '我是一名软件开发者。最开始专注于前端开发，长期使用 Vue 等技术构建 Web 产品、后台系统与跨境电商网站。随着经验积累，我开始关注界面之外的问题：一个产品为什么这样设计、数据应该如何组织、后端 API 如何设计、一个功能真正上线需要什么，以及部署之后如何持续维护。',
  },
  profile: {
    title: '成长路径',
    lede: '从界面出发，逐步走向产品。',
    areas: [
      {
        id: 'trajectory-frontend',
        label: '前端工程',
        description: '以前端开发为核心，使用 Vue 与 TypeScript 构建 Web 产品、后台系统与响应式界面。',
      },
      {
        id: 'trajectory-ecommerce',
        label: '电商业务',
        description: '参与跨境电商业务，开始接触真实的产品、运营与数据问题。',
      },
      {
        id: 'trajectory-independent',
        label: '独立开发',
        description: '独立完成前端、后端、数据库与部署，并对产品的最终结果负责。',
      },
      {
        id: 'trajectory-amazon',
        label: 'Amazon 运营',
        description: '独立运营 Amazon US 自有品牌店铺：产品选择、采购、Listing、广告与数据分析。',
      },
      {
        id: 'trajectory-ai',
        label: 'AI 与 AIGC',
        description: '把 AI 用于电商数据分析与内容生产，并使用 ComfyUI 构建图像生成与处理工作流。',
      },
      {
        id: 'trajectory-products',
        label: '数字产品',
        description: '关注软件、业务与 AI 之间的结合点，把问题推进到真正可以运行的产品。',
      },
    ],
  },
  philosophy: {
    title: '工作方式',
    lede: '我实际遵循的原则，以及我现在正在做的事情。',
    principles: [
      {
        id: 'principle-problem',
        title: '从问题开始',
        body: '先理解真正需要解决的问题，而不是先决定使用什么技术。',
      },
      {
        id: 'principle-runnable',
        title: '快速建立可运行版本',
        body: '通过合理的技术选型，把想法尽快变成可以验证的产品。',
      },
      {
        id: 'principle-quality',
        title: '保持工程质量',
        body: '架构、类型安全、测试、性能、可维护性与生产部署都属于工作本身。',
      },
      {
        id: 'principle-iterate',
        title: '持续迭代',
        body: '产品上线并不是结束，而是下一轮问题发现的开始。',
      },
      {
        id: 'principle-now',
        title: '现在正在做什么',
        body: '持续开发和维护 Eson_web；开发 Amazon-AI；运营 Amazon US Marketplace；探索 AI 与 AIGC；进行 ComfyUI Workflow 实践；寻找真实业务问题与软件产品之间的结合点。',
      },
    ],
  },
  capabilities: {
    title: '技术能力',
    lede: '这里描述工作范围与技术栈，不是技能评分表。',
    items: [
      {
        id: 'skill-frontend',
        title: '前端',
        description: '以 Vue / Nuxt / TypeScript 为主，覆盖响应式网站、H5 与后台管理系统。',
        technologies: [
          'Vue 2',
          'Vue 3',
          'Nuxt 4',
          'TypeScript',
          'JavaScript',
          'Pinia',
          'Vue Router',
          'Tailwind CSS',
          'Vite',
          '响应式开发',
          'H5',
          '后台管理系统',
        ],
      },
      {
        id: 'skill-backend',
        title: '后端',
        description: 'API、认证、数据库设计与数据建模。',
        technologies: [
          'NestJS',
          'Node.js',
          'Prisma',
          'PostgreSQL',
          'REST API',
          '认证',
          'JWT',
          '数据库设计',
        ],
      },
      {
        id: 'skill-product-engineering',
        title: '产品工程',
        description: '从需求到上线：CMS、API 设计与部署。',
        technologies: [
          '全栈开发',
          'CMS',
          'API 设计',
          '数据建模',
          'Docker',
          'Docker Compose',
          'Caddy',
          '生产部署',
          '测试',
        ],
      },
      {
        id: 'skill-ai-aigc',
        title: 'AI / AIGC',
        description: '把 AI 应用到产品中，并建立可复用的生成工作流。',
        technologies: [
          'AI / LLM',
          'ComfyUI',
          'ControlNet',
          'LoRA',
          'IPAdapter',
          'Image-to-Image',
          'Text-to-Image',
          'Inpainting',
          '批量生成',
          'AI 工作流设计',
        ],
      },
      {
        id: 'skill-ecommerce',
        title: '电商',
        description: 'Amazon US 实际运营经验，以及支撑运营的工具实践。',
        technologies: [
          'Amazon US Marketplace',
          'Listing',
          '广告',
          '产品数据分析',
          'Search Terms 分析',
          '关键词分析',
          '电商工作流',
        ],
      },
      {
        id: 'skill-design-content',
        title: '设计与内容',
        description: '界面设计与产品所需的视觉素材。',
        technologies: [
          'UI / UX',
          '产品视觉',
          'Photoshop',
          '即梦 AI',
          '剪映',
          'AIGC 视觉内容生产',
        ],
      },
      {
        id: 'skill-engineering-practices',
        title: '工程实践',
        description: '让项目在上线之后仍然可维护的习惯。',
        technologies: [
          'TypeScript 优先',
          '组件化架构',
          '响应式设计',
          '无障碍',
          'SEO',
          '自动化测试',
          '生产部署',
        ],
      },
    ],
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
