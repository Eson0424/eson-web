/**
 * 生产环境站点 URL 校验（上线前 P0/P1 修复）。
 *
 * 背景：`runtimeConfig.public.siteUrl` 的默认值是 http://localhost:3000。
 * 如果部署时漏传 NUXT_PUBLIC_SITE_URL，canonical / og:url / JSON-LD / sitemap
 * 会静默指向 localhost —— 这类错误不会报错，只会让整站 SEO 失效。
 *
 * 因此 production 下必须显式配置 https 的公开 origin，否则进程直接拒绝启动（fail-fast）。
 * development / test 不受影响，本地默认值仍然可用。
 */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  const siteUrl = String(useRuntimeConfig().public.siteUrl ?? '')

  let parsed: URL

  try {
    parsed = new URL(siteUrl)
  } catch {
    throw new Error(
      `[site-url] NUXT_PUBLIC_SITE_URL must be an absolute URL in production, received "${siteUrl}".`,
    )
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      `[site-url] NUXT_PUBLIC_SITE_URL must use https in production, received "${siteUrl}".`,
    )
  }

  if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(
      `[site-url] NUXT_PUBLIC_SITE_URL must not point at localhost in production, received "${siteUrl}".`,
    )
  }
})
