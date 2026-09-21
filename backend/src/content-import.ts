/**
 * 内容导入 CLI（Content Population Phase 1）—— 一次性命令，**不参与应用启动流程**。
 *
 * 用途：把 `src/content/eson-content.ts` 里已人工确认的真实内容写入数据库。
 *
 * 运行方式：
 *   本地（先构建）：  pnpm --filter backend build && pnpm --filter backend content:import
 *   本地预演：        pnpm --filter backend content:import -- --dry-run
 *   生产容器内：      docker compose -f docker-compose.prod.yml exec backend node dist/content-import.js --yes
 *
 * 安全设计：
 * - `NODE_ENV=production` 时必须显式传 `--yes`，避免误在生产库执行。
 * - 只打印目标库的 host:port/database，绝不打印凭据。
 * - 幂等：Work / Lab / Writing 按 slug upsert；Experience 按「确定性 UUID 主键」upsert；
 *   Category / Tag 按 slug upsert（含中英翻译）；SiteSetting 按 key upsert。
 * - 只新增/更新，**不删除任何既有行**（不改动 dev seed 的占位数据，也不清理 join 表）。
 * - 不修改数据库 Schema、不执行 migration、不执行 seed。
 *
 * 必填环境变量：DATABASE_URL（本地可由 backend/.env 提供）。
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { deterministicUuid } from './content/deterministic-uuid.js'
import {
  CATEGORY_SEEDS,
  EXPERIENCE_SEEDS,
  LAB_SEEDS,
  SETTING_SEEDS,
  TAG_SEEDS,
  WORK_SEEDS,
  WRITING_SEEDS,
  type ContentSeed,
  type TaxonomySeed,
} from './content/eson-content.js'
import { describeDatabaseTarget } from './modules/users/admin-bootstrap.js'

const ZH = 'zh-CN'
const EN = 'en-US'

/** 三类可翻译内容的委托名与复合唯一键前缀 */
const CONTENT_KINDS = {
  work: { model: 'work', translation: 'workTranslation', category: 'workCategory', tag: 'workTag', owner: 'workId', label: 'Work' },
  lab: { model: 'lab', translation: 'labTranslation', category: 'labCategory', tag: 'labTag', owner: 'labId', label: 'Lab' },
  writing: { model: 'writing', translation: 'writingTranslation', category: 'writingCategory', tag: 'writingTag', owner: 'writingId', label: 'Writing' },
} as const

type ContentKind = keyof typeof CONTENT_KINDS

interface ContentDelegate {
  findUnique(args: { where: { slug: string } }): Promise<{ id: string; status: string; publishedAt: Date | null } | null>
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>
}

interface UpsertDelegate {
  upsert(args: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>
}

interface ImportStats {
  categories: { created: number; updated: number }
  tags: { created: number; updated: number }
  works: { created: number; updated: number }
  labs: { created: number; updated: number }
  writings: { created: number; updated: number }
  experiences: { created: number; updated: number }
  settings: { created: number; updated: number }
}

function emptyStats(): ImportStats {
  return {
    categories: { created: 0, updated: 0 },
    tags: { created: 0, updated: 0 },
    works: { created: 0, updated: 0 },
    labs: { created: 0, updated: 0 },
    writings: { created: 0, updated: 0 },
    experiences: { created: 0, updated: 0 },
    settings: { created: 0, updated: 0 },
  }
}

function delegate(prisma: PrismaClient, name: string): UpsertDelegate {
  // seed.ts 使用同样的收窄方式：Prisma 的动态模型访问无法静态索引
  return (prisma as unknown as Record<string, UpsertDelegate>)[name]!
}

/** Category / Tag：按 slug upsert，并同步 zh-CN + en-US 名称 */
async function importTaxonomy(
  prisma: PrismaClient,
  model: 'category' | 'tag',
  defs: TaxonomySeed[],
  dryRun: boolean,
  stats: { created: number; updated: number },
): Promise<Map<string, string>> {
  const ids = new Map<string, string>()
  const translationModel = model === 'category' ? 'categoryTranslation' : 'tagTranslation'
  const ownerField = model === 'category' ? 'categoryId' : 'tagId'

  for (const [index, def] of defs.entries()) {
    const existing = await (prisma as unknown as Record<string, {
      findUnique(args: { where: { slug: string } }): Promise<{ id: string } | null>
    }>)[model]!.findUnique({ where: { slug: def.slug } })

    const data = model === 'category' ? { name: def.name } : { name: def.name }

    if (existing) {
      stats.updated += 1
      ids.set(def.slug, existing.id)

      if (!dryRun) {
        if (model === 'category') {
          await prisma.category.update({ where: { id: existing.id }, data: { sortOrder: index + 1 } })
        }

        for (const locale of [ZH, EN] as const) {
          await delegate(prisma, translationModel).upsert({
            where: { [`${ownerField}_locale`]: { [ownerField]: existing.id, locale } },
            update: { name: data.name[locale] },
            create: { [ownerField]: existing.id, locale, name: data.name[locale] },
          })
        }
      }

      continue
    }

    stats.created += 1

    if (dryRun) {
      ids.set(def.slug, `dry-run:${def.slug}`)
      continue
    }

    const created =
      model === 'category'
        ? await prisma.category.create({ data: { slug: def.slug, sortOrder: index + 1 } })
        : await prisma.tag.create({ data: { slug: def.slug } })

    ids.set(def.slug, created.id)

    for (const locale of [ZH, EN] as const) {
      await delegate(prisma, translationModel).upsert({
        where: { [`${ownerField}_locale`]: { [ownerField]: created.id, locale } },
        update: { name: data.name[locale] },
        create: { [ownerField]: created.id, locale, name: data.name[locale] },
      })
    }
  }

  return ids
}

/** Work / Lab / Writing：按 slug upsert 主体 + 翻译 + join 行 */
async function importContent(
  prisma: PrismaClient,
  kind: ContentKind,
  seed: ContentSeed,
  categoryIds: Map<string, string>,
  tagIds: Map<string, string>,
  authorId: string | null,
  dryRun: boolean,
  stats: { created: number; updated: number },
): Promise<void> {
  const config = CONTENT_KINDS[kind]
  const content = delegate(prisma, config.model) as unknown as ContentDelegate
  const existing = await content.findUnique({ where: { slug: seed.slug } })

  // publishedAt：PUBLISHED 必须有值（Public API 要求 publishedAt != null），
  // 首次写入用当前时间（导入即发布），后续运行保留原值。
  const publishedAt =
    seed.status === 'PUBLISHED'
      ? (existing?.publishedAt ?? new Date())
      : null

  const base: Record<string, unknown> = {
    slug: seed.slug,
    status: seed.status,
    featured: seed.featured,
    sortOrder: seed.sortOrder,
    publishedAt,
    ...(kind === 'work'
      ? {
          startDate: seed.startDate ? new Date(`${seed.startDate}T00:00:00.000Z`) : null,
          endDate: seed.endDate ? new Date(`${seed.endDate}T00:00:00.000Z`) : null,
        }
      : {}),
    ...(kind === 'writing' ? { authorId } : {}),
  }

  if (existing) {
    stats.updated += 1
    if (!dryRun) {
      await content.update({ where: { id: existing.id }, data: base })
    }
  } else {
    stats.created += 1
    if (dryRun) {
      return
    }
    await content.create({ data: base })
  }

  const record = existing ?? (await content.findUnique({ where: { slug: seed.slug } }))

  if (!record) {
    throw new Error(`[content:import] ${config.label} "${seed.slug}" could not be resolved after write`)
  }

  const id = record.id

  for (const translation of seed.translations) {
    const data = {
      title: translation.title,
      subtitle: translation.subtitle,
      content: translation.content,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      ...(kind === 'writing' ? { excerpt: translation.excerpt ?? null } : { summary: translation.summary ?? null }),
    }

    await delegate(prisma, config.translation).upsert({
      where: { [`${config.owner}_locale`]: { [config.owner]: id, locale: translation.locale } },
      update: data,
      create: { [config.owner]: id, locale: translation.locale, ...data },
    })
  }

  for (const slug of seed.categorySlugs) {
    const categoryId = categoryIds.get(slug)

    if (!categoryId) {
      throw new Error(`[content:import] ${config.label} "${seed.slug}" references unknown category "${slug}"`)
    }

    await delegate(prisma, config.category).upsert({
      where: { [`${config.owner}_categoryId`]: { [config.owner]: id, categoryId } },
      update: {},
      create: { [config.owner]: id, categoryId },
    })
  }

  for (const slug of seed.tagSlugs) {
    const tagId = tagIds.get(slug)

    if (!tagId) {
      throw new Error(`[content:import] ${config.label} "${seed.slug}" references unknown tag "${slug}"`)
    }

    await delegate(prisma, config.tag).upsert({
      where: { [`${config.owner}_tagId`]: { [config.owner]: id, tagId } },
      update: {},
      create: { [config.owner]: id, tagId },
    })
  }
}

/** Experience：主键由稳定 key 派生 → 天然幂等 */
async function importExperiences(
  prisma: PrismaClient,
  dryRun: boolean,
  stats: { created: number; updated: number },
): Promise<void> {
  for (const seed of EXPERIENCE_SEEDS) {
    const id = deterministicUuid(`eson-content:experience:${seed.key}`)
    const existing = await prisma.experience.findUnique({ where: { id } })

    const base = {
      id,
      sortOrder: seed.sortOrder,
      employmentType: seed.employmentType,
      startDate: new Date(`${seed.startDate}T00:00:00.000Z`),
      endDate: seed.endDate ? new Date(`${seed.endDate}T00:00:00.000Z`) : null,
      isCurrent: seed.isCurrent,
    }

    if (existing) {
      stats.updated += 1
      if (!dryRun) {
        await prisma.experience.update({
          where: { id },
          data: {
            sortOrder: base.sortOrder,
            employmentType: base.employmentType,
            startDate: base.startDate,
            endDate: base.endDate,
            isCurrent: base.isCurrent,
          },
        })
      }
    } else {
      stats.created += 1
      if (!dryRun) {
        await prisma.experience.create({ data: base })
      }
    }

    if (dryRun) {
      continue
    }

    for (const translation of seed.translations) {
      const data = {
        companyName: translation.companyName,
        roleName: translation.roleName,
        summary: translation.summary,
        content: translation.content ?? null,
      }

      await prisma.experienceTranslation.upsert({
        where: { experienceId_locale: { experienceId: id, locale: translation.locale } },
        update: data,
        create: { experienceId: id, locale: translation.locale, ...data },
      })
    }
  }
}

/** SiteSetting：按 key upsert */
async function importSettings(
  prisma: PrismaClient,
  dryRun: boolean,
  stats: { created: number; updated: number },
): Promise<void> {
  for (const seed of SETTING_SEEDS) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: seed.key } })
    const data = { value: seed.value, type: seed.type, description: seed.description }

    if (existing) {
      stats.updated += 1
      if (!dryRun) {
        await prisma.siteSetting.update({ where: { key: seed.key }, data })
      }
      continue
    }

    stats.created += 1
    if (!dryRun) {
      await prisma.siteSetting.create({ data: { key: seed.key, ...data } })
    }
  }
}

async function main(): Promise<void> {
  // dotenv 位于 devDependencies：本地开发用它读取 backend/.env；
  // 生产镜像没有该依赖，因此这里用可选加载（缺失时直接读容器环境变量）。
  try {
    await import('dotenv/config')
  } catch {
    // production image has no dotenv — 由容器环境变量提供 DATABASE_URL
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    console.error('[content:import] DATABASE_URL is not set — aborting.')
    process.exitCode = 1
    return
  }

  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')

  if (process.env.NODE_ENV === 'production' && !args.has('--yes')) {
    console.error(
      '[content:import] refusing to run against a production database without --yes. ' +
        'Re-run with: node dist/content-import.js --yes',
    )
    process.exitCode = 1
    return
  }

  // 只打印目标库的 host:port/database（不含凭据）
  console.log(`[content:import] target database: ${describeDatabaseTarget(databaseUrl)}`)
  console.log(`[content:import] mode: ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}`)

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stats = emptyStats()

  try {
    const categories = await importTaxonomy(prisma, 'category', CATEGORY_SEEDS, dryRun, stats.categories)
    const tags = await importTaxonomy(prisma, 'tag', TAG_SEEDS, dryRun, stats.tags)

    // Writing.authorId：写入唯一 ADMIN 用户（没有管理员时保持 null）
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
    const authorId = admin?.id ?? null

    for (const seed of WORK_SEEDS) {
      await importContent(prisma, 'work', seed, categories, tags, authorId, dryRun, stats.works)
    }

    for (const seed of LAB_SEEDS) {
      await importContent(prisma, 'lab', seed, categories, tags, authorId, dryRun, stats.labs)
    }

    for (const seed of WRITING_SEEDS) {
      await importContent(prisma, 'writing', seed, categories, tags, authorId, dryRun, stats.writings)
    }

    await importExperiences(prisma, dryRun, stats.experiences)
    await importSettings(prisma, dryRun, stats.settings)

    console.log('[content:import] summary (created / updated):')

    for (const [name, counts] of Object.entries(stats)) {
      console.log(`  ${name.padEnd(12)} ${counts.created} / ${counts.updated}`)
    }

    console.log('[content:import] done.')
  } catch (error) {
    console.error('[content:import] failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

await main()
