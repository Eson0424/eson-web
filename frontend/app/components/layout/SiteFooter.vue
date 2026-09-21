<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * 联系方式 props 只在真实存在时传入（AGENTS §45）。
 * 目前只有邮箱：GitHub / LinkedIn 未提供，因此对应链接不会渲染。
 */
const {
  email,
  github,
  linkedin,
} = defineProps<{
  email?: string
  github?: string
  linkedin?: string
}>()

const FOOTER_ITEMS: Array<{ key: string; to: RouteLocationRaw }> = [
  { key: 'work', to: '/work' },
  { key: 'lab', to: '/lab' },
  { key: 'writing', to: '/writing' },
  { key: 'about', to: '/about' },
  { key: 'experience', to: '/experience' },
  { key: 'contact', to: '/contact' },
]

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const footerItems = computed(() =>
  FOOTER_ITEMS.map((item) => ({ ...item, label: t(`nav.${item.key}`) })),
)

const socialLinks = computed(() =>
  [
    { label: 'GitHub', href: github },
    { label: 'LinkedIn', href: linkedin },
    { label: 'Email', href: email ? `mailto:${email}` : undefined },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href)),
)

const currentYear = new Date().getFullYear()

/**
 * ICP 备案号由部署环境注入（NUXT_PUBLIC_ICP_BEIAN → public.icpBeian）。
 *
 * 仓库里不写死备案号：同一份镜像要能部署到不同主体/域名。
 * 未注入时整块不渲染，避免出现空的“备案号：”占位。
 */
const ICP_LINK = 'https://beian.miit.gov.cn/'
const icpBeian = computed(() => (runtimeConfig.public.icpBeian ?? '').trim())
</script>

<template>
  <footer class="border-t border-line py-16">
    <AppContainer class="flex flex-col gap-12" width="page">
      <div class="grid gap-10 desktop:grid-cols-12">
        <div class="flex flex-col gap-3 desktop:col-span-6">
          <p class="type-small font-semibold uppercase tracking-[0.18em]">ESON</p>
          <p class="type-small text-ink-secondary">{{ t('app.tagline') }}</p>
        </div>

        <nav :aria-label="t('footer.navLabel')" class="desktop:col-span-3">
          <ul class="flex flex-col gap-2">
            <li v-for="item in footerItems" :key="item.key">
              <AppLink :to="item.to" class="type-small text-ink-secondary hover:text-ink">
                {{ item.label }}
              </AppLink>
            </li>
          </ul>
        </nav>

        <div v-if="socialLinks.length > 0" :aria-label="t('footer.socialLabel')" class="desktop:col-span-3">
          <ul class="flex flex-col gap-2">
            <li v-for="link in socialLinks" :key="link.label">
              <AppLink
                :href="link.href"
                class="type-small text-ink-secondary hover:text-ink"
                external
              >
                {{ link.label }}
              </AppLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="type-meta flex flex-col gap-2 text-ink-muted tablet:flex-row tablet:items-center tablet:justify-between">
        <p>© {{ currentYear }} ESON</p>
        <div class="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:gap-6">
          <p>{{ t('footer.rights') }}</p>
          <AppLink v-if="icpBeian" :href="ICP_LINK" external underline="none" class="type-meta">
            {{ icpBeian }}
          </AppLink>
        </div>
      </div>
    </AppContainer>
  </footer>
</template>
