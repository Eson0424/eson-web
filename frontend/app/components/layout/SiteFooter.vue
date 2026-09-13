<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const {
  email,
  github,
  linkedin,
} = defineProps<{
  /** 仅在真实存在时传入，禁止虚构联系方式（AGENTS §45） */
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
        <p>{{ t('footer.rights') }}</p>
      </div>
    </AppContainer>
  </footer>
</template>
