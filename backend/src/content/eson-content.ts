/**
 * Eson_web — 真实内容数据集（Content Population Phase 1）
 *
 * 用途：把已经人工确认的简历/项目内容，以**结构化数据**的形式保存下来，供：
 *   1. 内容导入脚本（`backend/src/content-import.ts` → `pnpm --filter backend content:import`）写入数据库
 *   2. 数据质量单测（`eson-content.spec.ts`）校验 slug、双语完整性、SEO 长度与禁用词
 *
 * 重要约束（AGENTS §8/§51、docs/DATABASE.md §66）：
 * - 本文件是**内容**，不是 schema：不新增数据表、不修改 Prisma Schema。
 * - 所有事实必须来自用户已确认的资料；**没有数据就不写**（不编造营收、订单量、ROAS/ACOS 成绩、
 *   客户、访问量、性能提升百分比、节省时间百分比、评价等任何量化成果）。
 * - 不包含 GitHub / LinkedIn 等未提供的社交账号。
 * - 与 `backend/prisma/seed.ts` 的 dev/QA 占位数据**互不干扰**：种子只用于本地开发，
 *   本数据集用于"真实内容"，导入脚本按 slug 幂等 upsert，不删除任何既有行。
 */

export type EsonLocale = 'zh-CN' | 'en-US'

export type ContentStatusValue = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type EmploymentTypeValue =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'FREELANCE'
  | 'CONTRACT'
  | 'SELF_EMPLOYED'
  | 'OTHER'

/** Work / Lab / Writing 的一条翻译（locale + 全部可见字段） */
export interface ContentTranslationSeed {
  locale: EsonLocale
  title: string
  subtitle: string
  /** Work / Lab 的摘要列 */
  summary?: string
  /** Writing 的摘要列（DATABASE §18） */
  excerpt?: string
  /** Markdown 风格正文：`## 章节` + 段落 + `- 列表项` */
  content: string
  seoTitle: string
  seoDescription: string
}

export interface ContentSeed {
  slug: string
  status: ContentStatusValue
  featured: boolean
  sortOrder: number
  /** 仅 Work 使用（Lab 无这两列） */
  startDate?: string
  endDate?: string
  categorySlugs: string[]
  tagSlugs: string[]
  /** 恰好两条：zh-CN + en-US */
  translations: ContentTranslationSeed[]
}

export interface ExperienceTranslationSeed {
  locale: EsonLocale
  /** 教育经历同样使用 companyName 承载学校名称（AGENTS §51 / 用户确认方案 A1） */
  companyName: string
  roleName: string
  /** /experience 时间线只渲染 summary（content 先保存，暂不展示） */
  summary: string
  content?: string
}

export interface ExperienceSeed {
  /** 幂等键：用于派生确定性主键（`deterministicUuid`），不是数据库可见字段 */
  key: string
  sortOrder: number
  employmentType: EmploymentTypeValue
  startDate: string
  endDate: string | null
  isCurrent: boolean
  translations: ExperienceTranslationSeed[]
}

export interface TaxonomySeed {
  slug: string
  name: Record<EsonLocale, string>
}

export interface SettingSeed {
  key: string
  value: string | boolean | string[]
  type: 'STRING' | 'BOOLEAN' | 'JSON'
  description: string
}

// ─────────────────────────── Category / Tag ──────────────────────────
// 只包含本数据集引用到的条目；Admin Category/Tag 仍是占位页，因此由导入脚本创建。
// slug 必须与既有 seed 不冲突（同名 slug 视为同一条，幂等更新名称）。

export const CATEGORY_SEEDS: TaxonomySeed[] = [
  { slug: 'platform', name: { 'zh-CN': '平台', 'en-US': 'Platform' } },
  { slug: 'ai-systems', name: { 'zh-CN': 'AI 系统', 'en-US': 'AI Systems' } },
  { slug: 'e-commerce', name: { 'zh-CN': '电商', 'en-US': 'E-commerce' } },
  { slug: 'data', name: { 'zh-CN': '数据', 'en-US': 'Data' } },
]

export const TAG_SEEDS: TaxonomySeed[] = [
  // 语言 / 框架 / 运行时
  { slug: 'vue', name: { 'zh-CN': 'Vue', 'en-US': 'Vue' } },
  { slug: 'nuxt', name: { 'zh-CN': 'Nuxt', 'en-US': 'Nuxt' } },
  { slug: 'typescript', name: { 'zh-CN': 'TypeScript', 'en-US': 'TypeScript' } },
  { slug: 'nextjs', name: { 'zh-CN': 'Next.js', 'en-US': 'Next.js' } },
  { slug: 'react', name: { 'zh-CN': 'React', 'en-US': 'React' } },
  { slug: 'nestjs', name: { 'zh-CN': 'NestJS', 'en-US': 'NestJS' } },
  { slug: 'nodejs', name: { 'zh-CN': 'Node.js', 'en-US': 'Node.js' } },
  { slug: 'tailwind', name: { 'zh-CN': 'Tailwind CSS', 'en-US': 'Tailwind CSS' } },
  // 数据 / 存储
  { slug: 'postgresql', name: { 'zh-CN': 'PostgreSQL', 'en-US': 'PostgreSQL' } },
  { slug: 'prisma', name: { 'zh-CN': 'Prisma', 'en-US': 'Prisma' } },
  // 工程 / 运维
  { slug: 'docker', name: { 'zh-CN': 'Docker', 'en-US': 'Docker' } },
  { slug: 'caddy', name: { 'zh-CN': 'Caddy', 'en-US': 'Caddy' } },
  { slug: 'cms', name: { 'zh-CN': 'CMS', 'en-US': 'CMS' } },
  { slug: 'full-stack', name: { 'zh-CN': '全栈', 'en-US': 'Full-stack' } },
  // 业务域
  { slug: 'amazon', name: { 'zh-CN': 'Amazon', 'en-US': 'Amazon' } },
  { slug: 'e-commerce', name: { 'zh-CN': '电商', 'en-US': 'E-commerce' } },
  { slug: 'marketplace', name: { 'zh-CN': 'Marketplace', 'en-US': 'Marketplace' } },
  { slug: 'product', name: { 'zh-CN': '产品', 'en-US': 'Product' } },
  { slug: 'data-analysis', name: { 'zh-CN': '数据分析', 'en-US': 'Data Analysis' } },
  { slug: 'automation', name: { 'zh-CN': '自动化', 'en-US': 'Automation' } },
  // AI / AIGC
  { slug: 'ai', name: { 'zh-CN': 'AI', 'en-US': 'AI' } },
  { slug: 'llm', name: { 'zh-CN': 'LLM', 'en-US': 'LLM' } },
  { slug: 'aigc', name: { 'zh-CN': 'AIGC', 'en-US': 'AIGC' } },
  { slug: 'comfyui', name: { 'zh-CN': 'ComfyUI', 'en-US': 'ComfyUI' } },
  { slug: 'image-generation', name: { 'zh-CN': '图像生成', 'en-US': 'Image Generation' } },
  { slug: 'workflow', name: { 'zh-CN': '工作流', 'en-US': 'Workflow' } },
  { slug: 'controlnet', name: { 'zh-CN': 'ControlNet', 'en-US': 'ControlNet' } },
  { slug: 'lora', name: { 'zh-CN': 'LoRA', 'en-US': 'LoRA' } },
  { slug: 'ipadapter', name: { 'zh-CN': 'IPAdapter', 'en-US': 'IPAdapter' } },
]

// ─────────────────────────────── Work ────────────────────────────────

export const WORK_SEEDS: ContentSeed[] = [
  {
    slug: 'eson-web',
    status: 'PUBLISHED',
    featured: true,
    sortOrder: 1,
    categorySlugs: ['platform'],
    tagSlugs: ['nuxt', 'vue', 'typescript', 'nestjs', 'postgresql', 'prisma', 'docker', 'caddy', 'cms', 'full-stack'],
    translations: [
      {
        locale: 'zh-CN',
        title: 'Eson_web',
        subtitle: '从个人网站，到一套完整的数字产品',
        summary:
          '一个从设计、开发、CMS、后端到生产部署全部独立完成的个人品牌网站。',
        content: [
          '## 背景',
          '长期从事前端开发之后，我希望建立一个真正属于自己的数字空间：既能展示工作经历与项目，也能持续承载新的作品、实验与文章。',
          '因此我没有把它做成一个静态简历页面，而是从产品结构、设计系统、前后端架构、内容管理、媒体管理、身份认证到生产部署，完整构建了一套可以长期运行与持续维护的 Web 产品。',
          '',
          '## 我的角色',
          '独立完成产品设计、前端开发、后端开发、数据库设计与生产部署，并负责上线后的持续维护。',
          '',
          '## 问题',
          '如果把内容写死在页面里，每增加一个项目或一篇文章都需要改代码、重新构建、重新部署。',
          '这样的结构无法长期承载持续增长的内容，也无法在不接触代码的情况下维护站点。',
          '',
          '## 核心工作',
          '- 先确定「内容必须能脱离代码维护」，因此把 Work / Lab / Writing / Experience 设计成内容类型，而不是写在页面里的文案',
          '- 为长期运营补齐内容与媒体能力：CMS、媒体库与图片选择，让新增内容不需要改代码、也不需要重新部署',
          '- 后台只对管理员开放，因此认证与权限校验放在后端完成，而不是靠前端隐藏入口',
          '- 数据层选择关系型建模：内容、翻译与分类标签之间的关系由 PostgreSQL 承载，schema 与迁移由 Prisma 管理',
          '- 前后端统一 TypeScript，并保持接口契约稳定，让 SSR 页面与 API 使用同一套数据结构',
          '- 上线采用容器化 + 反向代理：Docker Compose 保证可重复部署，Caddy 负责证书、反向代理与域名入口，同时建立数据库与媒体备份',
          '- 把 SEO、可访问性、响应式与自动化测试纳入交付范围，而不是上线后再补',
          '',
          '## 解决方案',
          '网站在前端之外增加了完整的后端与内容管理层：内容不再写死在页面里，而是通过 CMS 与后端 API 读取，使内容可以脱离代码独立维护。',
          '内容模型采用翻译表结构，中文与英文分别存储，因此两种语言可以各自维护。',
          '',
          '## 工程实现',
          '网站在前端之外保留独立的接口层：内容、认证与媒体都通过同一套后端 API 提供，页面只负责渲染，因此前端不需要了解数据存储细节。',
          '前后端都使用 TypeScript，目标是让接口契约与数据结构只有一处定义，避免跨端字段定义逐渐不一致。',
          '内容没有写死在页面里，而是建立了内容模型与 CMS：项目、实验、文章与经历由数据库驱动，新增内容不需要改代码或重新部署。',
          '数据层选择关系型方案：内容、翻译、分类与标签之间存在明确的关系，因此把数据放在 PostgreSQL、由 Prisma 管理 schema 与迁移，更适合长期维护。',
          '部署选择容器与反向代理：容器化让生产环境可以重复构建，Caddy 负责自动申请与续期证书、反向代理与域名入口，不需要手工维护证书与端口。',
          '',
          '## 结果',
          '项目已完成生产环境部署，并运行在独立域名下。',
          '同时具备前端、后端、数据库、CMS、认证、媒体管理、SEO、测试与生产部署能力。',
          '',
          '## 项目状态',
          '已上线，持续迭代。',
        ].join('\n'),
        seoTitle: 'Eson_web — 从个人网站到一套完整的数字产品',
        seoDescription:
          '从设计系统、前端、CMS、后端 API、数据库到生产部署独立完成的个人品牌网站项目。',
      },
      {
        locale: 'en-US',
        title: 'Eson_web',
        subtitle: 'From a personal website to a complete digital product',
        summary:
          'A personal brand website built independently across design, development, CMS, backend and production deployment.',
        content: [
          '## Background',
          'After years of frontend work, I wanted to build a digital space of my own: a place that shows my experience and projects, and can keep carrying new work, experiments and writing.',
          'So instead of building a static resume page, I built the whole product: information architecture, design system, frontend, backend, CMS, media management, authentication and production deployment.',
          '',
          '## Role',
          'Independent product design, frontend development, backend development, database design and production deployment, plus ongoing maintenance after launch.',
          '',
          '## Problem',
          'If content lives inside page components, every new project or article requires editing code, rebuilding and redeploying.',
          'That structure cannot carry growing content, and the site cannot be maintained without touching code.',
          '',
          '## Key work',
          '- Decided early that content had to be maintainable without touching code, so Work / Lab / Writing / Experience were modelled as content types instead of page-level copy',
          '- Added the content and media capability that long-term operation needs: a CMS with a media library and image selection, so new content needs no code change and no redeploy',
          '- Kept the admin surface administrator-only by putting authentication and role checks in the backend instead of hiding entry points in the frontend',
          '- Chose relational modelling for the data layer: PostgreSQL holds the relationships between content, translations, categories and tags, while Prisma manages the schema and migrations',
          '- Kept TypeScript on both sides of the boundary with a stable API contract, so SSR pages and the API work from the same data structures',
          '- Shipped with containers and a reverse proxy: Docker Compose makes releases repeatable, Caddy handles certificates, reverse proxying and the domain entry point, and database and media backups were added alongside it',
          '- Treated SEO, accessibility, responsive behaviour and automated tests as part of delivery rather than post-launch work',
          '',
          '## Approach',
          'The site goes beyond the frontend with a backend and a content layer: content is read from the CMS and the API instead of being hardcoded, so it can be maintained without code changes.',
          'Content models use translation tables, storing Chinese and English separately so both languages can be maintained on their own.',
          '',
          '## Engineering',
          'The site keeps a separate API layer in front of the data: content, authentication and media are all served by the same backend, and the pages only render, so the frontend does not need to know how data is stored.',
          'Both sides use TypeScript, so the API contract and the data structures are defined in one place instead of two definitions that drift apart.',
          'Content is not hardcoded in pages: a content model and CMS drive projects, experiments, articles and experience from the database, so adding content needs neither a code change nor a redeploy.',
          'The data layer is relational: content, translations, categories and tags have explicit relationships, so the data lives in PostgreSQL with Prisma managing the schema and migrations, which suits long-term maintenance.',
          'Deployment uses containers and a reverse proxy: containers make the production environment repeatable, and Caddy handles automatic certificate issuance and renewal, reverse proxying and the domain entry point, so certificates and ports are not maintained by hand.',
          '',
          '## Result',
          'The site is deployed to production and runs on its own domain.',
          'It includes frontend, backend, database, CMS, authentication, media management, SEO, testing and production deployment.',
          '',
          '## Status',
          'Live and continuously evolving.',
        ].join('\n'),
        seoTitle: 'Eson_web — From a personal website to a complete digital product',
        seoDescription:
          'A personal brand website built independently across design system, frontend, CMS, backend APIs, database and production deployment.',
      },
    ],
  },
  {
    slug: 'amazon-ai',
    status: 'PUBLISHED',
    featured: true,
    sortOrder: 2,
    categorySlugs: ['ai-systems', 'e-commerce'],
    tagSlugs: ['amazon', 'e-commerce', 'data-analysis', 'nextjs', 'react', 'typescript', 'ai', 'llm', 'automation'],
    translations: [
      {
        locale: 'zh-CN',
        title: 'Amazon-AI',
        subtitle: '把 Amazon 运营数据，变成可以执行的分析工具',
        summary:
          '一个面向 Amazon 广告与运营数据分析的独立开发工具。',
        content: [
          '## 背景',
          'Amazon Seller Central 中存在大量不同类型的数据报告。',
          '传统方式需要人工下载报告、判断报告类型、清洗数据、对比指标、寻找异常、分析关键词并整理结论。',
          '这个过程重复、耗时，而且容易受到人工判断影响。',
          '',
          '## 我的角色',
          '独立完成产品设计、全栈开发、数据分析逻辑设计与 AI 工作流设计。',
          '',
          '## 问题',
          '真正的问题并不是"不会分析"，而是分析过程本身非常重复。',
          '每次复盘都要重复相同的清理、对比与整理动作，真正的判断反而被挤压到最后。',
          '',
          '## 核心工作',
          '- 多类型报告导入：支持 CSV、XLSX、XLS',
          '- 编码处理：同时处理 UTF-8 与 UTF-16LE',
          '- 报告类型自动识别',
          '- 重复数据检测与保护',
          '- 广告与运营诊断规则',
          '- 关键词分析',
          '- Listing 分析',
          '- Listing 五维评分',
          '- Markdown 报告生成',
          '- AI Prompt Chain',
          '',
          '## 解决方案',
          '围绕广告与运营数据建立 9 条诊断规则，用于识别不同类型的广告与运营问题，例如：',
          '- 高花费无订单',
          '- 高 ACOS',
          '- 高点击低转化',
          '- 高曝光低 CTR',
          '- 高 ROAS',
          '- 以及其他广告与运营指标诊断规则',
          '系统根据诊断结果进一步生成带优先级的处理建议。',
          '在数据分析之后，AI 能力被接入实际运营流程，形成：产品卖点 → 使用场景 → 图片创意 → 结构化 ComfyUI Prompt 的 Prompt Chain。',
          '',
          '## 工程实现',
          '- 前端与运行时：Next.js 16、React 19、TypeScript、Tailwind CSS 4',
          '- 数据层：Drizzle + SQLite',
          '- 数据处理：ExcelJS、PapaParse、Zod',
          '- 安全边界：不接入 Amazon 平台账号，也不保存平台登录状态',
          '- 人工确认：涉及高风险操作的建议不会自动执行，而是进入人工确认流程',
          '',
          '## 结果',
          '目前已完成从报告导入、数据分析、规则诊断、关键词管理、Listing 评分到 AI Prompt 生成的一整套基础能力。',
          '',
          '## 项目状态',
          '持续开发，独立产品实验。',
        ].join('\n'),
        seoTitle: 'Amazon-AI — 把 Amazon 运营数据变成可执行的分析工具',
        seoDescription:
          '一个面向 Amazon 广告与运营数据分析的独立工具：报告导入、诊断规则、关键词分析、Listing 五维评分与 AI Prompt Chain。',
      },
      {
        locale: 'en-US',
        title: 'Amazon-AI',
        subtitle: 'Turning Amazon operation data into an analysis workflow',
        summary:
          'An independent tool for Amazon advertising and operations data analysis.',
        content: [
          '## Background',
          'Amazon Seller Central produces many different kinds of reports.',
          'The manual workflow means downloading reports, identifying report types, cleaning data, comparing metrics, looking for anomalies, analysing keywords and writing up conclusions.',
          'It is repetitive, slow and heavily dependent on manual judgement.',
          '',
          '## Role',
          'Independent product design, full-stack development, data analysis logic and AI workflow design.',
          '',
          '## Problem',
          'The real problem was not a lack of analysis skill, but how repetitive the analysis process is.',
          'Every review cycle repeats the same cleaning, comparison and write-up work, leaving the actual judgement for the end.',
          '',
          '## Key work',
          '- Multi-format report import: CSV, XLSX, XLS',
          '- Encoding handling: UTF-8 and UTF-16LE',
          '- Automatic report type detection',
          '- Duplicate data detection and protection',
          '- Advertising and operations diagnostic rules',
          '- Keyword analysis',
          '- Listing analysis',
          '- Five-dimensional Listing scoring',
          '- Markdown report generation',
          '- AI Prompt Chain',
          '',
          '## Approach',
          'Nine diagnostic rules cover common advertising and operations problems, for example:',
          '- High spend with no orders',
          '- High ACOS',
          '- High clicks with low conversion',
          '- High impressions with low CTR',
          '- High ROAS',
          '- and other advertising and operations metric diagnostics',
          'The system turns diagnostics into prioritised next actions.',
          'AI is connected to the operating workflow through a Prompt Chain: product selling points → usage scenarios → image concepts → structured ComfyUI prompts.',
          '',
          '## Engineering',
          '- Frontend and runtime: Next.js 16, React 19, TypeScript, Tailwind CSS 4',
          '- Data layer: Drizzle + SQLite',
          '- Data processing: ExcelJS, PapaParse, Zod',
          '- Security boundary: no Amazon account connection and no stored platform session',
          '- Human confirmation: high-risk actions are never executed automatically; they go through manual confirmation',
          '',
          '## Result',
          'The tool covers report import, data analysis, rule-based diagnostics, keyword management, Listing scoring and AI prompt generation.',
          '',
          '## Status',
          'Independent product, continuously evolving.',
        ].join('\n'),
        seoTitle: 'Amazon-AI — Turning Amazon operation data into an analysis workflow',
        seoDescription:
          'An independent tool for Amazon advertising and operations analysis: report import, diagnostic rules, keyword analysis, five-dimensional Listing scoring and an AI Prompt Chain.',
      },
    ],
  },
  {
    slug: 'amazon-us-marketplace',
    status: 'PUBLISHED',
    featured: true,
    sortOrder: 3,
    categorySlugs: ['e-commerce'],
    tagSlugs: ['amazon', 'e-commerce', 'marketplace', 'product', 'data-analysis', 'ai', 'automation'],
    translations: [
      {
        locale: 'zh-CN',
        title: 'Amazon US Marketplace',
        subtitle: '从开发者，到真实的电商业务现场',
        summary:
          '独立运营 Amazon US 自有品牌店铺，并将真实运营问题转化为软件产品需求。',
        content: [
          '## 背景',
          '这是我从纯软件开发走向真实业务场景的一次实践。',
          '目前我独立运营 Amazon US 自有品牌店铺，负责从产品选择、采购、Listing、广告到数据分析的完整流程。',
          '',
          '## 我的角色',
          '独立运营，同时负责产品分析、数据分析与配套软件工具的开发。',
          '',
          '## 问题',
          '在真实运营过程中，大量时间并不是花在"做决策"上，而是花在下载报告、整理数据、对比指标、寻找异常、分析关键词与整理广告数据上。',
          '这类问题无法只从工程一侧理解，必须真正参与业务才会暴露出来。',
          '',
          '## 核心工作',
          '- 产品选择',
          '- 采购',
          '- Listing',
          '- 广告',
          '- 数据分析',
          '- 日常运营',
          '',
          '## 解决方案',
          '把重复的运营动作沉淀为软件工具：真实业务中的问题先被抽象成需求，再开发成分析工具，工具产出的数据反过来支持运营判断。',
          '',
          '## 工程实现',
          '店铺目前包含 5 个 SKU。',
          '运营工作与 Amazon-AI 之间形成一条完整链路：',
          '- 真实业务',
          '- 发现问题',
          '- 抽象需求',
          '- 软件开发',
          '- 数据分析',
          '- AI 辅助内容生产',
          '',
          '## 结果',
          '这段经历让我不再只从"开发功能"的角度理解产品，而开始同时考虑业务目标、数据、运营流程、工具效率与自动化。',
          '',
          '## 项目状态',
          '持续运营，持续实验。',
        ].join('\n'),
        seoTitle: 'Amazon US Marketplace — 从开发者到真实的电商业务现场',
        seoDescription:
          '独立运营 Amazon US 自有品牌店铺（5 个 SKU）：产品选择、采购、Listing、广告、数据分析与日常运营，并将业务问题转化为软件需求。',
      },
      {
        locale: 'en-US',
        title: 'Amazon US Marketplace',
        subtitle: 'From software development to a real business environment',
        summary:
          'Independently operating an Amazon US private-label store, and turning operational problems into software requirements.',
        content: [
          '## Background',
          'This is where I moved from pure software development into a real business environment.',
          'I independently operate an Amazon US private-label store and handle the full workflow: product selection, procurement, listing, advertising and data analysis.',
          '',
          '## Role',
          'Marketplace operations, product analysis, data analysis and tool development.',
          '',
          '## Problem',
          'In day-to-day operations, most of the time is not spent making decisions but downloading reports, organising data, comparing metrics, finding anomalies, analysing keywords and cleaning up advertising data.',
          'Problems like these cannot be understood from the engineering side alone; they only appear when you are actually in the business.',
          '',
          '## Key work',
          '- Product selection',
          '- Procurement',
          '- Listing',
          '- Advertising',
          '- Data analysis',
          '- Daily operations',
          '',
          '## Approach',
          'Repetitive operational work becomes software: real problems are abstracted into requirements, built into analysis tools, and the tooling output supports operational decisions in return.',
          '',
          '## Engineering',
          'The store currently contains five SKUs.',
          'The operations work and Amazon-AI form one chain:',
          '- Real business',
          '- Problem discovery',
          '- Requirement abstraction',
          '- Software development',
          '- Data analysis',
          '- AI-assisted content production',
          '',
          '## Result',
          'This experience changed how I look at products: not only as features to build, but as a combination of business goals, data, operations, tooling efficiency and automation.',
          '',
          '## Status',
          'Active and continuously evolving.',
        ].join('\n'),
        seoTitle: 'Amazon US Marketplace — From software development to a real business environment',
        seoDescription:
          'Independently operating an Amazon US private-label store (five SKUs): product selection, procurement, listing, advertising, data analysis and daily operations that became software requirements.',
      },
    ],
  },
]

// ─────────────────────────────── Lab ─────────────────────────────────

export const LAB_SEEDS: ContentSeed[] = [
  {
    slug: 'comfyui-aigc-workflow',
    status: 'PUBLISHED',
    featured: true,
    sortOrder: 1,
    categorySlugs: ['ai-systems'],
    tagSlugs: ['comfyui', 'aigc', 'ai', 'image-generation', 'workflow', 'controlnet', 'lora', 'ipadapter'],
    translations: [
      {
        locale: 'zh-CN',
        title: 'ComfyUI / AIGC Workflow',
        subtitle: '从生成一张图片，到建立可复用的工作流',
        summary:
          '探索 AIGC 在真实内容生产中的应用，并把一次性生成转化为可复用的工作流。',
        content: [
          '## 概述',
          '我开始使用 ComfyUI，并不是单纯为了生成图片。',
          '我更关注的是：如何把 AIGC 从一次性的"出图"，变成可以重复使用、批量生产和持续优化的工作流。',
          '',
          '## 实验方向',
          '- Text-to-Image',
          '- Image-to-Image',
          '- Inpainting',
          '- Batch Upscaling',
          '- ControlNet',
          '- LoRA',
          '- IPAdapter',
          '',
          '## 工作流设计',
          '围绕不同内容生产场景建立可复用的 Workflow。',
          '通过节点组合、参数控制与模型配置，让同一套流程可以针对不同需求重复使用。',
          '',
          '## 工程化尝试',
          '除了直接使用 ComfyUI，我也尝试让前端页面调用 Workflow API。',
          '整个流程因此可以从需求 → 前端输入 → Workflow → AI 生成 → 输出，逐步形成更完整的产品化链路。',
          '',
          '## 观察',
          '相比单张图片的最终效果，我更关注可复用性、可控制性、批量生成、稳定性、工作流结构与生产效率。',
          '',
          '## 当前状态',
          '持续实验，Workflow 持续迭代。',
        ].join('\n'),
        seoTitle: 'ComfyUI / AIGC Workflow — 建立可复用的图像生成工作流',
        seoDescription:
          '使用 ComfyUI 实践 Text-to-Image、Image-to-Image、Inpainting、ControlNet、LoRA 与 IPAdapter，并把一次性生成整理为可复用的 Workflow。',
      },
      {
        locale: 'en-US',
        title: 'ComfyUI / AIGC Workflow',
        subtitle: 'From generating images to building reusable workflows',
        summary:
          'Applying AIGC to real content production, and turning one-off generation into reusable workflows.',
        content: [
          '## Overview',
          'I did not start using ComfyUI just to generate images.',
          'What interests me is turning AIGC from a one-off generation step into workflows that can be reused, batch-produced and improved over time.',
          '',
          '## Practice areas',
          '- Text-to-Image',
          '- Image-to-Image',
          '- Inpainting',
          '- Batch Upscaling',
          '- ControlNet',
          '- LoRA',
          '- IPAdapter',
          '',
          '## Workflow design',
          'I build reusable workflows for different content production scenarios.',
          'Through node composition, parameter control and model configuration, the same pipeline can serve different requirements.',
          '',
          '## Engineering experiments',
          'Beyond using ComfyUI directly, I experimented with calling Workflow APIs from frontend interfaces.',
          'The pipeline can therefore move from requirement → frontend input → workflow → generation → output, towards a more complete product flow.',
          '',
          '## Observations',
          'More than the final look of a single image, I care about reusability, controllability, batch generation, stability, workflow structure and production efficiency.',
          '',
          '## Status',
          'Active research, workflows continuously evolving.',
        ].join('\n'),
        seoTitle: 'ComfyUI / AIGC Workflow — Building reusable image generation workflows',
        seoDescription:
          'Practising Text-to-Image, Image-to-Image, Inpainting, ControlNet, LoRA and IPAdapter in ComfyUI, and turning one-off generation into reusable workflows.',
      },
    ],
  },
]

// ────────────────────────────── Writing ──────────────────────────────
// 5 篇均为 DRAFT：不进入 Public API，仅存在 CMS/数据库中供后续继续撰写。
// content 明确标注为写作大纲，不伪装成已完成文章。

const DRAFT_OUTLINE_NOTE_ZH = '写作大纲（正文待撰写）。'
const DRAFT_OUTLINE_NOTE_EN = 'Writing outline (draft body not written yet).'

export const WRITING_SEEDS: ContentSeed[] = [
  {
    slug: 'why-i-built-eson-web',
    status: 'DRAFT',
    featured: false,
    sortOrder: 1,
    categorySlugs: ['platform'],
    tagSlugs: ['nuxt', 'nestjs', 'postgresql', 'cms'],
    translations: [
      {
        locale: 'zh-CN',
        title: '为什么开始做 Eson_web',
        subtitle: '一个前端开发者如何走向完整的产品开发',
        excerpt:
          '一个前端开发者为什么决定从写页面开始，走向完整地构建自己的产品？从设计系统、前端、后端、数据库，到 CMS、部署和持续维护，这是我第一次真正把一个属于自己的 Web 产品完整做起来。',
        content: [
          '## 大纲',
          `- ${DRAFT_OUTLINE_NOTE_ZH}`,
          '- 为什么开始做',
          '- 为什么不只是做一个静态个人简历',
          '- 为什么需要 CMS',
          '- 为什么自己做后端',
          '- 如何设计前后端架构',
          '- 如何处理认证',
          '- 如何做生产部署',
          '- 上线过程中遇到的问题',
          '- 接下来准备继续做什么',
        ].join('\n'),
        seoTitle: '为什么开始做 Eson_web',
        seoDescription:
          '记录 Eson_web 从想法到上线的过程：为什么需要 CMS、为什么自己做后端，以及生产部署中遇到的问题。',
      },
      {
        locale: 'en-US',
        title: 'Why I Started Building Eson_web',
        subtitle: 'How a frontend developer moved towards building a complete product',
        excerpt:
          'Why a frontend developer decided to move from building pages to building a complete product of his own — from design system and frontend to backend, database, CMS, deployment and maintenance.',
        content: [
          '## Outline',
          `- ${DRAFT_OUTLINE_NOTE_EN}`,
          '- Why I started',
          '- Why not just a static resume page',
          '- Why a CMS was needed',
          '- Why I built the backend myself',
          '- How the frontend and backend are structured',
          '- How authentication is handled',
          '- How production deployment is done',
          '- Problems found during launch',
          '- What comes next',
        ].join('\n'),
        seoTitle: 'Why I Started Building Eson_web',
        seoDescription:
          'How Eson_web went from an idea to production: why a CMS was needed, why I built the backend, and what broke along the way.',
      },
    ],
  },
  {
    slug: 'from-frontend-to-product-builder',
    status: 'DRAFT',
    featured: false,
    sortOrder: 2,
    categorySlugs: ['platform'],
    tagSlugs: ['typescript', 'product', 'full-stack'],
    translations: [
      {
        locale: 'zh-CN',
        title: '一个前端开发者如何开始做自己的产品',
        subtitle: '从写页面，到对产品结果负责',
        excerpt:
          '做了多年前端之后，我开始发现，真正困难的问题往往不在于"怎么写页面"。从需求、产品结构、数据模型、API，到部署和运营，每一个环节都会影响最终结果。',
        content: [
          '## 大纲',
          `- ${DRAFT_OUTLINE_NOTE_ZH}`,
          '- 前端开发与产品开发的区别',
          '- 为什么开始学习后端',
          '- 为什么开始关注数据库',
          '- 为什么开始自己部署',
          '- 独立开发带来的最大变化',
          '- AI 对独立开发的影响',
          '- 我希望成为怎样的开发者',
        ].join('\n'),
        seoTitle: '一个前端开发者如何开始做自己的产品',
        seoDescription:
          '从需求、产品结构、数据模型、API 到部署与运营：一个前端开发者走向独立产品开发的过程与思考。',
      },
      {
        locale: 'en-US',
        title: 'How a Frontend Developer Started Building His Own Products',
        subtitle: 'From writing pages to owning the product outcome',
        excerpt:
          'After years of frontend work, I realised the hard problems were rarely about writing pages. Requirements, product structure, data models, APIs, deployment and operations all shape the outcome.',
        content: [
          '## Outline',
          `- ${DRAFT_OUTLINE_NOTE_EN}`,
          '- Frontend development versus product development',
          '- Why I started learning backend work',
          '- Why I started caring about databases',
          '- Why I started deploying things myself',
          '- What changed most about working independently',
          '- How AI affects independent development',
          '- The kind of developer I want to become',
        ].join('\n'),
        seoTitle: 'How a Frontend Developer Started Building His Own Products',
        seoDescription:
          'From requirements, product structure, data models and APIs to deployment and operations: how a frontend developer moved into independent product work.',
      },
    ],
  },
  {
    slug: 'why-i-built-amazon-ai',
    status: 'DRAFT',
    featured: false,
    sortOrder: 3,
    categorySlugs: ['ai-systems', 'e-commerce'],
    tagSlugs: ['amazon', 'data-analysis', 'ai', 'llm'],
    translations: [
      {
        locale: 'zh-CN',
        title: '为什么我开始开发 Amazon-AI',
        subtitle: '从真实运营问题到软件工具',
        excerpt:
          '真正开始运营 Amazon US 店铺之后，我发现很多问题并不是"不会分析"，而是分析过程本身非常重复。下载报告、清洗数据、比较指标、寻找异常、整理结论——Amazon-AI 就是在这些真实问题中逐渐形成的。',
        content: [
          '## 大纲',
          `- ${DRAFT_OUTLINE_NOTE_ZH}`,
          '- Amazon 运营中的数据问题',
          '- 为什么人工分析效率低',
          '- 报告导入系统',
          '- 数据诊断规则',
          '- 关键词分析',
          '- Listing 五维评分',
          '- AI Prompt Chain',
          '- 软件如何反过来帮助业务',
        ].join('\n'),
        seoTitle: '为什么我开始开发 Amazon-AI',
        seoDescription:
          '从 Amazon 运营中的真实数据问题出发：报告导入、诊断规则、关键词分析、Listing 五维评分与 AI Prompt Chain。',
      },
      {
        locale: 'en-US',
        title: 'Why I Started Building Amazon-AI',
        subtitle: 'From real operations problems to a software tool',
        excerpt:
          'Once I started actually operating an Amazon US store, I found the problem was rarely a lack of analysis — the analysis process itself was repetitive. Amazon-AI grew out of those problems.',
        content: [
          '## Outline',
          `- ${DRAFT_OUTLINE_NOTE_EN}`,
          '- Data problems in Amazon operations',
          '- Why manual analysis is slow',
          '- The report import system',
          '- Diagnostic rules',
          '- Keyword analysis',
          '- Five-dimensional Listing scoring',
          '- The AI Prompt Chain',
          '- How software feeds back into the business',
        ].join('\n'),
        seoTitle: 'Why I Started Building Amazon-AI',
        seoDescription:
          'Starting from real Amazon operations problems: report import, diagnostic rules, keyword analysis, five-dimensional Listing scoring and an AI Prompt Chain.',
      },
    ],
  },
  {
    slug: 'from-image-generation-to-workflow',
    status: 'DRAFT',
    featured: false,
    sortOrder: 4,
    categorySlugs: ['ai-systems'],
    tagSlugs: ['comfyui', 'aigc', 'workflow', 'image-generation'],
    translations: [
      {
        locale: 'zh-CN',
        title: '从一张图片，到一个 ComfyUI 工作流',
        subtitle: '把一次性生成变成可复用流程',
        excerpt:
          '开始使用 ComfyUI 之后，我逐渐发现，我真正感兴趣的并不是"生成一张漂亮的图片"，而是如何把一次性的生成过程变成可以复用、调整和批量运行的工作流。',
        content: [
          '## 大纲',
          `- ${DRAFT_OUTLINE_NOTE_ZH}`,
          '- 为什么开始使用 ComfyUI',
          '- Text-to-Image',
          '- Image-to-Image',
          '- ControlNet',
          '- LoRA',
          '- IPAdapter',
          '- 工作流设计',
          '- 批量生成',
          '- 前端调用 Workflow API',
          '- AIGC 产品化',
        ].join('\n'),
        seoTitle: '从一张图片，到一个 ComfyUI 工作流',
        seoDescription:
          'ComfyUI 实践记录：Text-to-Image、Image-to-Image、ControlNet、LoRA、IPAdapter，以及把生成过程整理为可复用工作流。',
      },
      {
        locale: 'en-US',
        title: 'From a Single Image to a ComfyUI Workflow',
        subtitle: 'Turning one-off generation into a reusable pipeline',
        excerpt:
          'After I started using ComfyUI, I realised I was less interested in generating one nice image than in turning a one-off generation process into a workflow I can reuse, adjust and batch run.',
        content: [
          '## Outline',
          `- ${DRAFT_OUTLINE_NOTE_EN}`,
          '- Why I started using ComfyUI',
          '- Text-to-Image',
          '- Image-to-Image',
          '- ControlNet',
          '- LoRA',
          '- IPAdapter',
          '- Workflow design',
          '- Batch generation',
          '- Calling Workflow APIs from a frontend',
          '- Turning AIGC into a product',
        ].join('\n'),
        seoTitle: 'From a Single Image to a ComfyUI Workflow',
        seoDescription:
          'ComfyUI practice notes: Text-to-Image, Image-to-Image, ControlNet, LoRA and IPAdapter, and turning generation into reusable workflows.',
      },
    ],
  },
  {
    slug: 'how-eson-web-went-live',
    status: 'DRAFT',
    featured: false,
    sortOrder: 5,
    categorySlugs: ['platform'],
    tagSlugs: ['docker', 'caddy', 'postgresql'],
    translations: [
      {
        locale: 'zh-CN',
        title: '一个个人网站是如何真正上线的',
        subtitle: '从本地代码到可以访问的站点',
        excerpt:
          '从本地代码到真正可以访问的网站，中间还有很多事情：服务器、Docker、数据库、HTTPS、域名、SEO、备份、安全配置，以及上线之后的验证。',
        content: [
          '## 大纲',
          `- ${DRAFT_OUTLINE_NOTE_ZH}`,
          '- 本地开发',
          '- Git release',
          '- Docker',
          '- PostgreSQL',
          '- Caddy',
          '- HTTPS',
          '- DNS',
          '- ICP 备案',
          '- 数据库备份',
          '- 上线验收',
          '- 后续维护',
        ].join('\n'),
        seoTitle: '一个个人网站是如何真正上线的',
        seoDescription:
          'Eson_web 从开发环境走向生产环境的过程：Docker、PostgreSQL、Caddy、HTTPS、域名、备案、备份与上线验收。',
      },
      {
        locale: 'en-US',
        title: 'How a Personal Website Actually Went Live',
        subtitle: 'From local code to a reachable site',
        excerpt:
          'Getting from local code to a website people can actually open involves much more: servers, Docker, databases, HTTPS, domains, SEO, backups, security configuration and post-launch verification.',
        content: [
          '## Outline',
          `- ${DRAFT_OUTLINE_NOTE_EN}`,
          '- Local development',
          '- Git release',
          '- Docker',
          '- PostgreSQL',
          '- Caddy',
          '- HTTPS',
          '- DNS',
          '- ICP filing',
          '- Database backups',
          '- Launch verification',
          '- Ongoing maintenance',
        ].join('\n'),
        seoTitle: 'How a Personal Website Actually Went Live',
        seoDescription:
          'How Eson_web moved from development to production: Docker, PostgreSQL, Caddy, HTTPS, domains, filing, backups and launch verification.',
      },
    ],
  },
]

// ───────────────────────────── Experience ────────────────────────────
// 4 段工作经历 + 1 段教育经历（用户确认方案 A1：教育经历也是 Experience 的一条，
// companyName=学校、roleName=专业与学历、employmentType=OTHER、sortOrder 排最后）。
// /experience 时间线只渲染 summary；更完整的要点保存在 content 中备用。

export const EXPERIENCE_SEEDS: ExperienceSeed[] = [
  {
    key: 'experience-independent-2025',
    sortOrder: 1,
    employmentType: 'SELF_EMPLOYED',
    startDate: '2025-07-01',
    endDate: null,
    isCurrent: true,
    translations: [
      {
        locale: 'zh-CN',
        companyName: '独立开发 / 自由职业',
        roleName: '前端开发工程师 / 独立开发者',
        summary:
          '从传统前端开发逐步转向独立产品开发：独立完成 Web 产品的前端、后端与数据库开发及 Docker 生产部署，同时运营 Amazon US Marketplace、开发 Amazon-AI，并实践 AI / AIGC 与 ComfyUI 工作流。',
        content: [
          '- 独立完成 Web 产品开发',
          '- 前端、后端与数据库开发',
          '- Docker 生产部署',
          '- Amazon US Marketplace 运营',
          '- Amazon 数据分析工具开发',
          '- AI / AIGC 工作流实践',
          '- ComfyUI 图像生成与工作流开发',
        ].join('\n'),
      },
      {
        locale: 'en-US',
        companyName: 'Independent / Freelance',
        roleName: 'Frontend Engineer / Independent Developer',
        summary:
          'Moved from traditional frontend work into independent product development: frontend, backend, database and Docker-based production deployment for my own products, together with running an Amazon US marketplace store, building Amazon-AI and practising AI / AIGC workflows in ComfyUI.',
        content: [
          '- Independent web product development',
          '- Frontend, backend and database development',
          '- Docker-based production deployment',
          '- Amazon US marketplace operations',
          '- Amazon data analysis tooling',
          '- AI / AIGC workflow practice',
          '- ComfyUI image generation and workflow development',
        ].join('\n'),
      },
    ],
  },
  {
    key: 'experience-taixin-2023',
    sortOrder: 2,
    employmentType: 'FULL_TIME',
    startDate: '2023-09-01',
    endDate: '2025-06-30',
    isCurrent: false,
    translations: [
      {
        locale: 'zh-CN',
        companyName: '深圳台欣电子科技有限公司',
        roleName: '前端开发工程师',
        summary:
          '负责公司网站前端开发，并逐渐参与产品视觉内容生产：产品视觉素材、产品图片与主图制作、产品详情页视觉内容，使用 Photoshop、即梦 AI 与剪映辅助内容生产。',
        content: [
          '- 公司网站前端开发',
          '- 产品视觉素材制作',
          '- 产品图片与主图制作',
          '- 产品详情页视觉内容',
          '- 使用 Photoshop 与即梦 AI 辅助内容生产',
          '- 使用剪映制作产品视频',
        ].join('\n'),
      },
      {
        locale: 'en-US',
        companyName: 'Shenzhen Taixin Electronic Technology Co., Ltd.',
        roleName: 'Frontend Engineer',
        summary:
          'Frontend development for the company website, with growing involvement in product visual production: product visual assets, product images and main images, and detail page visuals, using Photoshop, Jimeng AI and JianYing.',
        content: [
          '- Company website frontend development',
          '- Product visual asset production',
          '- Product images and main images',
          '- Product detail page visuals',
          '- Content production with Photoshop and Jimeng AI',
          '- Product video production with JianYing',
        ].join('\n'),
      },
    ],
  },
  {
    key: 'experience-shidai-2021',
    sortOrder: 3,
    employmentType: 'FULL_TIME',
    startDate: '2021-09-01',
    endDate: '2023-09-30',
    isCurrent: false,
    translations: [
      {
        locale: 'zh-CN',
        companyName: '深圳十代信息技术有限公司',
        roleName: '前端开发工程师',
        summary:
          '参与 B2B / SaaS 产品开发，负责产品与订单模块、通用表单/表格/弹窗组件开发、API 接口对接、Pinia 状态管理、跨域问题处理与前端性能优化，并在项目中建立了一套复用度较高的通用组件结构。',
        content: [
          '- 产品与订单模块开发',
          '- 通用表单、表格、弹窗组件开发',
          '- API 接口对接',
          '- Pinia 状态管理',
          '- 跨域问题处理',
          '- 前端性能优化',
          '- 代码规范与组件复用',
        ].join('\n'),
      },
      {
        locale: 'en-US',
        companyName: 'Shenzhen Shidai Information Technology Co., Ltd.',
        roleName: 'Frontend Engineer',
        summary:
          'Worked on B2B / SaaS products: product and order modules, reusable form, table and modal components, API integration, Pinia state management, CORS handling and frontend performance work, with a reusable shared component structure established in the project.',
        content: [
          '- Product and order module development',
          '- Reusable form, table and modal components',
          '- API integration',
          '- Pinia state management',
          '- CORS handling',
          '- Frontend performance work',
          '- Code standards and component reuse',
        ].join('\n'),
      },
    ],
  },
  {
    key: 'experience-kaifanla-2019',
    sortOrder: 4,
    employmentType: 'FULL_TIME',
    startDate: '2019-10-01',
    endDate: '2021-08-31',
    isCurrent: false,
    translations: [
      {
        locale: 'zh-CN',
        companyName: '开饭喇科技（深圳）有限公司',
        roleName: '前端开发工程师',
        summary:
          '参与餐饮互联网产品的 PC、H5 与商家 / 管理后台开发：餐厅列表、餐厅详情、评论与评分、商家端与管理后台，负责响应式页面与组件开发、前端性能优化，并参与产品与设计协作及部分旧系统向 Vue 技术栈的渐进式改造。',
        content: [
          '- 餐厅列表与餐厅详情',
          '- 评论与评分',
          '- 商家端与管理后台',
          '- 响应式页面与组件开发',
          '- 前端性能优化',
          '- 产品与设计协作',
          '- 旧系统向 Vue 技术栈的渐进式改造',
        ].join('\n'),
      },
      {
        locale: 'en-US',
        companyName: 'Kaifanla Technology (Shenzhen) Co., Ltd.',
        roleName: 'Frontend Engineer',
        summary:
          'Built PC, H5 and merchant / admin interfaces for a restaurant product: restaurant list and detail pages, comments and ratings, merchant and admin consoles, responsive pages and components, and frontend performance work, while collaborating with product and design and migrating parts of a legacy system towards Vue.',
        content: [
          '- Restaurant list and detail pages',
          '- Comments and ratings',
          '- Merchant and admin consoles',
          '- Responsive pages and component development',
          '- Frontend performance work',
          '- Collaboration with product and design',
          '- Progressive migration of a legacy system towards Vue',
        ].join('\n'),
      },
    ],
  },
  {
    key: 'experience-education-tju-2014',
    sortOrder: 5,
    employmentType: 'OTHER',
    startDate: '2014-09-01',
    endDate: '2018-06-30',
    isCurrent: false,
    translations: [
      {
        locale: 'zh-CN',
        companyName: '天津大学仁爱学院',
        roleName: '本科 · 通信工程',
        summary: '本科 · 通信工程（2014 — 2018）。',
      },
      {
        locale: 'en-US',
        companyName: 'Tianjin University Renai College',
        roleName: 'BSc, Communication Engineering',
        summary: 'BSc in Communication Engineering (2014 — 2018).',
      },
    ],
  },
]

// ─────────────────────────── Site settings ───────────────────────────

export const SETTING_SEEDS: SettingSeed[] = [
  {
    key: 'site.title',
    value: 'ESON',
    type: 'STRING',
    description: '站点名称（品牌）',
  },
  {
    key: 'site.description',
    value: 'ESON — AI 增强型数字产品开发者（AI-Enhanced Digital Product Developer）',
    type: 'STRING',
    description: '站点定位（与 About / 站点 title 一致）',
  },
  {
    key: 'site.defaultLocale',
    value: 'zh-CN',
    type: 'STRING',
    description: '默认语言（AGENTS §9）',
  },
  {
    key: 'site.locales',
    value: ['zh-CN', 'en-US'],
    type: 'JSON',
    description: 'V1 支持的语言',
  },
  {
    key: 'site.available',
    value: true,
    type: 'BOOLEAN',
    description: '是否接受合作（用户已确认：接受）',
  },
  {
    key: 'site.email',
    value: 'jikang0424@163.com',
    type: 'STRING',
    description: '公开联系邮箱（与 Footer / Contact 一致）',
  },
]
