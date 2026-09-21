import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  devtools: { enabled: false },

  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],

  components: [{ path: '~/components', pathPrefix: false }],

  // API service 层（app/services/*）参与自动导入，页面只通过 composable/service 访问 API
  imports: {
    dirs: ['services'],
  },

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
  },

  app: {
    // 页面过渡：Exit 150–250ms / Enter 250–500ms（docs/DESIGN.md §24）。
    pageTransition: { name: 'page', mode: 'out-in' },
    /**
     * 站点图标与 Web App manifest。
     * 资源都在 frontend/public 下，由 Nitro 直接静态托管（不依赖第三方图片服务）。
     */
    head: {
      link: [
        // ICO 内含 16 / 32 / 48 三个尺寸
        { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [{ name: 'theme-color', content: '#07080C' }],
    },
  },

  /**
   * Admin 区域完全 CSR（Phase 4-B.1）。
   *
   * 原因：SSR 阶段用 refresh cookie 换回的 access token 会被 pinia state 序列化进
   * __NUXT_DATA__，使 /admin/** 的 HTML 响应体里出现 JWT。
   * Admin 改为客户端渲染后，token 只存在于浏览器内存，不再进入 HTML。
   *
   * Public 站点保持 SSR（AGENTS §5：Public SSR/SSG oriented，Admin CSR oriented）。
   */
  routeRules: {
    '/admin/**': { ssr: false },
  },

  runtimeConfig: {
    /**
     * 仅服务端（SSR）使用的 API base（Phase 5-F）。
     *
     * 生产拓扑是 Caddy → frontend / backend，frontend 的 SSR 请求应该走 Docker 内网
     * （例如 http://backend:3001/api/v1），而不是经公网入口回环到 Caddy：
     * 回环依赖宿主机 DNS/NAT 与证书信任，任一环节不同都会让 SSR 数据加载失败。
     * 留空 = 与 public.apiBase 相同（本地开发行为不变）。
     * 部署时通过 NUXT_API_BASE_SERVER 注入。
     */
    apiBaseServer: '',

    public: {
      // 本地默认值仅用于开发；生产通过 NUXT_PUBLIC_API_BASE 覆盖。
      apiBase: 'http://localhost:3001/api/v1',
      // 用于 canonical / Open Graph 的站点地址，生产通过 NUXT_PUBLIC_SITE_URL 覆盖。
      siteUrl: 'http://localhost:3000',
      // 默认社交分享图（详情页有 cover 时用详情页自己的图覆盖）。
      defaultOgImage: '/og-image.png',
      /**
       * ICP 备案号，生产通过 NUXT_PUBLIC_ICP_BEIAN 注入（例如 粤ICP备xxxxxxxx号-1）。
       * 仓库内不写死：留空时 Footer 不渲染备案块。
       */
      icpBeian: '',
    },
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'zh-CN',
    locales: [
      { code: 'zh-CN', name: '中文', language: 'zh-CN', file: 'zh-CN.json' },
      { code: 'en-US', name: 'English', language: 'en-US', file: 'en-US.json' },
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'eson_locale',
      redirectOn: 'root',
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
