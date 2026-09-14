/**
 * Eson_web — Prisma seed（Phase 3）
 *
 * 为开发与 API QA 提供明确标记为 demo/placeholder 的数据：
 * published / draft / archived、zh-CN / en-US、缺失翻译（fallback）、featured、
 * categories、tags、media metadata、experience、contact messages、site settings。
 *
 * 禁止：真实个人履历、公司、客户、收入与项目成果。
 * 运行：pnpm --filter backend prisma:seed（需要可用的 PostgreSQL）
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

/**
 * 安全护栏（Phase 5-D）：seed 仅用于开发与 QA，包含占位内容与开发默认管理员。
 * 生产数据库初始化必须使用 `prisma migrate deploy` + `admin:bootstrap`，绝不运行 seed。
 */
if (process.env.NODE_ENV === 'production') {
  console.error(
    '[seed] Refusing to run: NODE_ENV=production. ' +
      'Production uses `prisma migrate deploy` plus the admin bootstrap command instead of seed.',
  )
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('[seed] DATABASE_URL is not set — aborting.')
  process.exit(1)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const ZH = 'zh-CN'
const EN = 'en-US'
const PLACEHOLDER = 'Placeholder content for development and API QA.'

type ContentStatusValue = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

type ContentSeed = {
  slug: string
  status: ContentStatusValue
  featured: boolean
  sortOrder: number
  locales: string[]
  categorySlugs: string[]
  tagSlugs: string[]
  year: string
  readingTime?: number
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'dev-only-password'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: await argon2.hash(adminPassword), isActive: true },
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      name: 'Demo Admin',
      role: 'ADMIN',
      isActive: true,
    },
  })

  const categories = await seedCategories()
  const tags = await seedTags()
  await seedMedia()

  for (const work of WORK_SEEDS) {
    const record = await prisma.work.upsert({
      where: { slug: work.slug },
      update: buildContentUpdate(work),
      create: {
        slug: work.slug,
        ...buildContentCreate(work),
        startDate: new Date(Date.UTC(Number(work.year), 0, 1)),
      },
    })

    await seedWorkTranslations(record.id, work)
    await linkJoin(record.id, work.categorySlugs, categories, 'workCategory', 'workId')
    await linkJoin(record.id, work.tagSlugs, tags, 'workTag', 'workId')
  }

  for (const lab of LAB_SEEDS) {
    const record = await prisma.lab.upsert({
      where: { slug: lab.slug },
      update: buildContentUpdate(lab),
      create: { slug: lab.slug, ...buildContentCreate(lab) },
    })

    await seedLabTranslations(record.id, lab)
    await linkJoin(record.id, lab.categorySlugs, categories, 'labCategory', 'labId')
    await linkJoin(record.id, lab.tagSlugs, tags, 'labTag', 'labId')
  }

  for (const writing of WRITING_SEEDS) {
    const record = await prisma.writing.upsert({
      where: { slug: writing.slug },
      update: { ...buildContentUpdate(writing), readingTime: writing.readingTime ?? null },
      create: {
        slug: writing.slug,
        ...buildContentCreate(writing),
        readingTime: writing.readingTime ?? null,
        authorId: admin.id,
      },
    })

    await seedWritingTranslations(record.id, writing)
    await linkJoin(record.id, writing.categorySlugs, categories, 'writingCategory', 'writingId')
    await linkJoin(record.id, writing.tagSlugs, tags, 'writingTag', 'writingId')
  }

  await seedExperiences()

  for (const setting of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, type: setting.type },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        description: 'Seeded for development and QA.',
      },
    })
  }

  if ((await prisma.contactMessage.count()) === 0) {
    await prisma.contactMessage.createMany({
      data: (['UNREAD', 'READ', 'ARCHIVED'] as const).map((status) => ({
        name: 'Demo Sender',
        email: 'demo.sender@example.com',
        subject: `Demo enquiry (${status.toLowerCase()})`,
        message: 'Seeded demo message used for API QA. Not a real enquiry.',
        status,
        ipHash: `seed-hash-${status.toLowerCase()}`,
        userAgent: 'seed',
      })),
    })
  }

  console.log('[seed] completed', {
    users: await prisma.user.count(),
    works: await prisma.work.count(),
    workTranslations: await prisma.workTranslation.count(),
    labs: await prisma.lab.count(),
    writings: await prisma.writing.count(),
    experiences: await prisma.experience.count(),
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    media: await prisma.media.count(),
    contactMessages: await prisma.contactMessage.count(),
    siteSettings: await prisma.siteSetting.count(),
  })
}

// ─────────────────────────── content seeds ───────────────────────────

const WORK_SEEDS: ContentSeed[] = [
  { slug: 'eson-web', status: 'PUBLISHED', featured: true, sortOrder: 1, locales: [ZH, EN], categorySlugs: ['platform'], tagSlugs: ['nuxt', 'nestjs', 'postgresql', 'prisma'], year: '2026' },
  { slug: 'agent-workflow', status: 'PUBLISHED', featured: true, sortOrder: 2, locales: [ZH, EN], categorySlugs: ['ai-systems'], tagSlugs: ['typescript', 'llm', 'automation'], year: '2025' },
  { slug: 'commerce-automation', status: 'PUBLISHED', featured: false, sortOrder: 3, locales: [ZH, EN], categorySlugs: ['e-commerce'], tagSlugs: ['nodejs', 'data', 'tooling'], year: '2024' },
  // 故意缺少 en-US 翻译 → 验证 zh-CN fallback
  { slug: 'design-system-toolkit', status: 'PUBLISHED', featured: false, sortOrder: 4, locales: [ZH], categorySlugs: ['frontend'], tagSlugs: ['vue', 'tailwind'], year: '2024' },
  // DRAFT / ARCHIVED → Public API 必须过滤
  { slug: 'draft-work', status: 'DRAFT', featured: false, sortOrder: 5, locales: [ZH, EN], categorySlugs: ['backend'], tagSlugs: ['typescript'], year: '2024' },
  { slug: 'archived-work', status: 'ARCHIVED', featured: false, sortOrder: 6, locales: [ZH, EN], categorySlugs: ['backend'], tagSlugs: ['postgresql'], year: '2023' },
]

const LAB_SEEDS: ContentSeed[] = [
  { slug: 'agent-workflow-prototype', status: 'PUBLISHED', featured: true, sortOrder: 1, locales: [ZH, EN], categorySlugs: ['ai-systems'], tagSlugs: ['typescript', 'agents'], year: '2026' },
  { slug: 'interface-experiment', status: 'PUBLISHED', featured: true, sortOrder: 2, locales: [ZH, EN], categorySlugs: ['interaction'], tagSlugs: ['vue', 'motion'], year: '2026' },
  { slug: 'automation-toolkit', status: 'PUBLISHED', featured: false, sortOrder: 3, locales: [ZH, EN], categorySlugs: ['automation'], tagSlugs: ['nodejs', 'tooling'], year: '2025' },
  { slug: 'local-first-notes', status: 'PUBLISHED', featured: false, sortOrder: 4, locales: [ZH, EN], categorySlugs: ['data'], tagSlugs: ['typescript', 'storage'], year: '2025' },
  { slug: 'draft-lab', status: 'DRAFT', featured: false, sortOrder: 5, locales: [ZH, EN], categorySlugs: ['interaction'], tagSlugs: ['css'], year: '2025' },
  { slug: 'archived-lab', status: 'ARCHIVED', featured: false, sortOrder: 6, locales: [ZH, EN], categorySlugs: ['interaction'], tagSlugs: ['css'], year: '2024' },
]

const WRITING_SEEDS: ContentSeed[] = [
  { slug: 'engineering-first-design-system', status: 'PUBLISHED', featured: true, sortOrder: 1, locales: [ZH, EN], categorySlugs: ['engineering'], tagSlugs: ['nuxt', 'design-system'], year: '2026', readingTime: 8 },
  { slug: 'notes-on-agent-workflows', status: 'PUBLISHED', featured: true, sortOrder: 2, locales: [ZH, EN], categorySlugs: ['ai-systems'], tagSlugs: ['agents', 'llm'], year: '2026', readingTime: 6 },
  { slug: 'internal-automation-tools', status: 'PUBLISHED', featured: false, sortOrder: 3, locales: [ZH, EN], categorySlugs: ['automation'], tagSlugs: ['tooling'], year: '2026', readingTime: 5 },
  { slug: 'typescript-across-the-boundary', status: 'PUBLISHED', featured: false, sortOrder: 4, locales: [ZH, EN], categorySlugs: ['engineering'], tagSlugs: ['typescript', 'api'], year: '2025', readingTime: 7 },
  { slug: 'ecommerce-operations-as-software', status: 'PUBLISHED', featured: false, sortOrder: 5, locales: [ZH, EN], categorySlugs: ['e-commerce'], tagSlugs: ['automation', 'data'], year: '2025', readingTime: 6 },
  { slug: 'draft-writing', status: 'DRAFT', featured: false, sortOrder: 6, locales: [ZH, EN], categorySlugs: ['engineering'], tagSlugs: ['typescript'], year: '2025', readingTime: 4 },
  { slug: 'archived-writing', status: 'ARCHIVED', featured: false, sortOrder: 7, locales: [ZH, EN], categorySlugs: ['engineering'], tagSlugs: ['typescript'], year: '2024', readingTime: 3 },
]

const SETTINGS = [
  { key: 'site.title', value: 'ESON', type: 'STRING' as const },
  { key: 'site.description', value: PLACEHOLDER, type: 'STRING' as const },
  { key: 'site.defaultLocale', value: ZH, type: 'STRING' as const },
  { key: 'site.locales', value: [ZH, EN], type: 'JSON' as const },
  // 诚实状态：尚未确认可接单，因此为 false（页面不消费该值之前不产生影响）
  { key: 'site.available', value: false, type: 'BOOLEAN' as const },
]

function buildContentUpdate(seed: ContentSeed) {
  return {
    status: seed.status,
    featured: seed.featured,
    sortOrder: seed.sortOrder,
    publishedAt: seed.status === 'PUBLISHED' ? new Date(Date.UTC(Number(seed.year), 5, 21)) : null,
  }
}

function buildContentCreate(seed: ContentSeed) {
  return { ...buildContentUpdate(seed) }
}

async function seedWorkTranslations(workId: string, seed: ContentSeed) {
  for (const locale of seed.locales) {
    await prisma.workTranslation.upsert({
      where: { workId_locale: { workId, locale } },
      update: { summary: PLACEHOLDER },
      create: {
        workId,
        locale,
        title: localizedTitle(seed.slug, locale),
        subtitle: locale === ZH ? '占位项目' : 'Placeholder project',
        summary: PLACEHOLDER,
        content: locale === ZH ? '占位案例内容。' : 'Placeholder case study content.',
        seoTitle: localizedTitle(seed.slug, locale),
        seoDescription: PLACEHOLDER,
      },
    })
  }
}

async function seedLabTranslations(labId: string, seed: ContentSeed) {
  for (const locale of seed.locales) {
    await prisma.labTranslation.upsert({
      where: { labId_locale: { labId, locale } },
      update: { summary: PLACEHOLDER },
      create: {
        labId,
        locale,
        title: localizedTitle(seed.slug, locale),
        subtitle: locale === ZH ? '占位实验' : 'Placeholder experiment',
        summary: PLACEHOLDER,
        content: locale === ZH ? '占位实验内容。' : 'Placeholder experiment content.',
        seoTitle: localizedTitle(seed.slug, locale),
        seoDescription: PLACEHOLDER,
      },
    })
  }
}

async function seedWritingTranslations(writingId: string, seed: ContentSeed) {
  for (const locale of seed.locales) {
    await prisma.writingTranslation.upsert({
      where: { writingId_locale: { writingId, locale } },
      update: { excerpt: PLACEHOLDER },
      create: {
        writingId,
        locale,
        title: localizedTitle(seed.slug, locale),
        subtitle: locale === ZH ? '占位文章' : 'Placeholder article',
        excerpt: PLACEHOLDER,
        content: locale === ZH ? '占位正文内容。' : 'Placeholder article content.',
        seoTitle: localizedTitle(seed.slug, locale),
        seoDescription: PLACEHOLDER,
      },
    })
  }
}

async function seedExperiences() {
  const existing = await prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } })

  const definitions = [
    { slug: 'placeholder-role-1', isCurrent: true, sortOrder: 1 },
    { slug: 'placeholder-role-2', isCurrent: false, sortOrder: 2 },
  ]

  for (const [index, definition] of definitions.entries()) {
    const record =
      existing[index] ??
      (await prisma.experience.create({
        data: { isCurrent: definition.isCurrent, sortOrder: definition.sortOrder },
      }))

    for (const locale of [ZH, EN]) {
      await prisma.experienceTranslation.upsert({
        where: { experienceId_locale: { experienceId: record.id, locale } },
        update: {},
        create: {
          experienceId: record.id,
          locale,
          roleName: locale === ZH ? '职位占位' : 'Role placeholder',
          // 不写入公司、地点、时间与成果
          companyName: null,
          summary:
            locale === ZH
              ? '占位条目：接入真实经历后显示真实的职位、组织与结果。'
              : 'Placeholder entry: real role, organization and outcomes appear once connected.',
          content: null,
        },
      })
    }
  }
}

async function linkJoin(
  ownerId: string,
  slugs: string[],
  targets: Array<{ id: string; slug: string }>,
  model: 'workCategory' | 'workTag' | 'labCategory' | 'labTag' | 'writingCategory' | 'writingTag',
  ownerField: 'workId' | 'labId' | 'writingId',
) {
  const targetField = model.endsWith('Category') ? 'categoryId' : 'tagId'
  const delegate = prisma[model] as unknown as {
    upsert: (args: { where: unknown; update: unknown; create: unknown }) => Promise<unknown>
  }

  for (const slug of slugs) {
    const target = targets.find((item) => item.slug === slug)

    if (!target) {
      continue
    }

    await delegate.upsert({
      where: { [`${ownerField}_${targetField}`]: { [ownerField]: ownerId, [targetField]: target.id } },
      update: {},
      create: { [ownerField]: ownerId, [targetField]: target.id },
    })
  }
}

async function seedCategories() {
  const definitions = [
    { slug: 'platform', zh: '平台', en: 'Platform' },
    { slug: 'ai-systems', zh: 'AI 系统', en: 'AI Systems' },
    { slug: 'e-commerce', zh: '电商', en: 'E-commerce' },
    { slug: 'frontend', zh: '前端', en: 'Frontend' },
    { slug: 'backend', zh: '后端', en: 'Backend' },
    { slug: 'engineering', zh: '工程', en: 'Engineering' },
    { slug: 'automation', zh: '自动化', en: 'Automation' },
    { slug: 'interaction', zh: '交互', en: 'Interaction' },
    { slug: 'data', zh: '数据', en: 'Data' },
  ]

  return Promise.all(
    definitions.map(async (definition, index) => {
      const record = await prisma.category.upsert({
        where: { slug: definition.slug },
        update: { sortOrder: index + 1 },
        create: { slug: definition.slug, sortOrder: index + 1 },
      })

      for (const [locale, name] of [[ZH, definition.zh], [EN, definition.en]] as const) {
        await prisma.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: record.id, locale } },
          update: { name },
          create: { categoryId: record.id, locale, name },
        })
      }

      return record
    }),
  )
}

async function seedTags() {
  const definitions = [
    { slug: 'nuxt', zh: 'Nuxt', en: 'Nuxt' },
    { slug: 'nestjs', zh: 'NestJS', en: 'NestJS' },
    { slug: 'postgresql', zh: 'PostgreSQL', en: 'PostgreSQL' },
    { slug: 'prisma', zh: 'Prisma', en: 'Prisma' },
    { slug: 'typescript', zh: 'TypeScript', en: 'TypeScript' },
    { slug: 'vue', zh: 'Vue', en: 'Vue' },
    { slug: 'tailwind', zh: 'Tailwind CSS', en: 'Tailwind CSS' },
    { slug: 'llm', zh: 'LLM', en: 'LLM' },
    { slug: 'agents', zh: 'Agent', en: 'Agents' },
    { slug: 'automation', zh: '自动化', en: 'Automation' },
    { slug: 'nodejs', zh: 'Node.js', en: 'Node.js' },
    { slug: 'data', zh: '数据', en: 'Data' },
    { slug: 'tooling', zh: '工具链', en: 'Tooling' },
    { slug: 'motion', zh: '动效', en: 'Motion' },
    { slug: 'css', zh: 'CSS', en: 'CSS' },
    { slug: 'storage', zh: '存储', en: 'Storage' },
    { slug: 'design-system', zh: '设计系统', en: 'Design System' },
    { slug: 'api', zh: 'API', en: 'API' },
  ]

  return Promise.all(
    definitions.map(async (definition) => {
      const record = await prisma.tag.upsert({
        where: { slug: definition.slug },
        update: {},
        create: { slug: definition.slug },
      })

      for (const [locale, name] of [[ZH, definition.zh], [EN, definition.en]] as const) {
        await prisma.tagTranslation.upsert({
          where: { tagId_locale: { tagId: record.id, locale } },
          update: { name },
          create: { tagId: record.id, locale, name },
        })
      }

      return record
    }),
  )
}

/**
 * Media 元数据示例：只写入 database metadata，不挂载为 cover，
 * 也不写入二进制（本机没有对象存储，避免前端渲染出 404 图片）。
 */
async function seedMedia() {
  const definitions = [
    { storageKey: 'seed/placeholder-1.webp', filename: 'placeholder-1.webp' },
    { storageKey: 'seed/placeholder-2.webp', filename: 'placeholder-2.webp' },
  ]

  for (const definition of definitions) {
    const existing = await prisma.media.findFirst({ where: { storageKey: definition.storageKey } })

    if (existing) {
      continue
    }

    await prisma.media.create({
      data: {
        storageKey: definition.storageKey,
        url: `/media/${definition.storageKey}`,
        filename: definition.filename,
        originalFilename: definition.filename,
        mimeType: 'image/webp',
        size: 0,
        width: 1600,
        height: 900,
        alt: 'Placeholder media metadata (no binary stored)',
        metadata: { provider: 'seed', placeholder: true },
      },
    })
  }
}

const ZH_TITLES: Record<string, string> = {
  'eson-web': 'Eson_web',
  'agent-workflow': 'Agent Workflow（占位）',
  'commerce-automation': 'Commerce Automation（占位）',
  'design-system-toolkit': '设计系统工具集（占位）',
  'draft-work': '草稿项目（占位）',
  'archived-work': '归档项目（占位）',
  'agent-workflow-prototype': 'Agent 工作流原型（占位）',
  'interface-experiment': '界面实验（占位）',
  'automation-toolkit': '自动化工具集（占位）',
  'local-first-notes': '本地优先笔记（占位）',
  'draft-lab': '草稿实验（占位）',
  'archived-lab': '归档实验（占位）',
  'engineering-first-design-system': '工程优先的设计系统（占位）',
  'notes-on-agent-workflows': 'Agent 工作流的几点笔记（占位）',
  'internal-automation-tools': '构建内部自动化工具（占位）',
  'typescript-across-the-boundary': '跨越前后端边界的 TypeScript（占位）',
  'ecommerce-operations-as-software': '把电商运营当作软件来做（占位）',
  'draft-writing': '草稿文章（占位）',
  'archived-writing': '归档文章（占位）',
}

function localizedTitle(slug: string, locale: string): string {
  if (locale === ZH) {
    return ZH_TITLES[slug] ?? `${humanizeSlug(slug)}（占位）`
  }

  if (slug === 'eson-web') {
    return 'Eson_web'
  }

  return humanizeSlug(slug)
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

main()
  .catch((error) => {
    console.error('[seed] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
