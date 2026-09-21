import { setHeader } from 'h3'

/**
 * /sitemap.xml（Nitro server route，不引入 @nuxtjs/sitemap 依赖）。
 *
 * 内容：
 * - 固定公开路由（含 /experience、/contact，它们在 no_prefix 下没有语言前缀）
 * - 已发布内容的详情页（Work / Lab / Writing），slug 来自 Public API
 *
 * 明确排除：/admin/**、/design-system、任何 localhost 地址。
 * Public API 只返回 status=PUBLISHED 且 publishedAt != null 的内容，因此这里不需要再过滤。
 * 内容 API 暂时不可用时仍然输出固定路由，避免 sitemap 整体 404 让搜索引擎误判站点下线。
 */
const STATIC_PATHS = ['/', '/work', '/lab', '/writing', '/experience', '/about', '/contact']

/** slug 详情页所属的 API 资源与路由前缀 */
const CONTENT_SOURCES = [
  { resource: 'work', prefix: '/work' },
  { resource: 'lab', prefix: '/lab' },
  { resource: 'writing', prefix: '/writing' },
] as const

const SITEMAP_PAGE_SIZE = 100
const CONTENT_FETCH_TIMEOUT_MS = 5_000

interface SitemapEntry {
  path: string
  lastmod?: string
}

interface ContentListItem {
  slug?: string
  updatedAt?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** ISO 时间只保留日期部分（W3C datetime 允许 date 形式） */
function toLastmod(value: string | undefined): string | undefined {
  if (!value || value.length < 10) {
    return undefined
  }

  return value.slice(0, 10)
}

async function fetchContentEntries(base: string): Promise<SitemapEntry[]> {
  const results = await Promise.all(
    CONTENT_SOURCES.map(async ({ resource, prefix }) => {
      try {
        const response = await $fetch<{ data?: ContentListItem[] }>(`${base}/${resource}`, {
          query: { pageSize: SITEMAP_PAGE_SIZE },
          timeout: CONTENT_FETCH_TIMEOUT_MS,
        })
        const items = Array.isArray(response?.data) ? response.data : []

        return items
          .filter((item): item is ContentListItem & { slug: string } => Boolean(item.slug))
          .map<SitemapEntry>((item) => ({
            path: `${prefix}/${item.slug}`,
            lastmod: toLastmod(item.updatedAt),
          }))
      } catch {
        return []
      }
    }),
  )

  return results.flat()
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl ?? '').replace(/\/+$/, '')
  const apiBase = String(config.apiBaseServer || config.public.apiBase || '').replace(/\/+$/, '')

  const entries: SitemapEntry[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...(apiBase ? await fetchContentEntries(apiBase) : []),
  ]

  // 同一路径只出现一次（内容 API 与固定路由理论上不会重叠，这里做一次防御）
  const seen = new Set<string>()
  const unique = entries.filter((entry) => {
    if (seen.has(entry.path)) {
      return false
    }

    seen.add(entry.path)

    return true
  })

  const urls = unique
    .map((entry) =>
      [
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}${entry.path === '/' ? '/' : entry.path}`)}</loc>`,
        ...(entry.lastmod ? [`    <lastmod>${entry.lastmod}</lastmod>`] : []),
        '  </url>',
      ].join('\n'),
    )
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
