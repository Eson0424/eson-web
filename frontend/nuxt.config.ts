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
    public: {
      // 本地默认值仅用于开发；生产通过 NUXT_PUBLIC_API_BASE 覆盖。
      apiBase: 'http://localhost:3001/api/v1',
      // 用于 canonical / Open Graph 的站点地址，生产通过 NUXT_PUBLIC_SITE_URL 覆盖。
      siteUrl: 'http://localhost:3000',
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
