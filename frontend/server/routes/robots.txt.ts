import { setHeader } from 'h3'

/**
 * /robots.txt（Nitro server route，不引入 @nuxtjs/robots 依赖）。
 *
 * 只允许公开页面被抓取：
 * - /admin/**     后台，且返回 noindex
 * - /design-system 内部设计系统预览页
 * - /api/**       同源的 REST API，不是可索引内容
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl ?? '').replace(/\/+$/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /design-system',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
