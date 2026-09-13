<script setup lang="ts">
type NavItem = { key: string; to: string }

// 主导航（DESIGN §10、AGENTS §44）；Experience / Contact 通过移动端菜单与页脚进入。
const PRIMARY_ITEMS: NavItem[] = [
  { key: 'work', to: '/work' },
  { key: 'lab', to: '/lab' },
  { key: 'writing', to: '/writing' },
  { key: 'about', to: '/about' },
]

const MOBILE_ONLY_ITEMS: NavItem[] = [
  { key: 'experience', to: '/experience' },
  { key: 'contact', to: '/contact' },
]

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

const { t } = useI18n()
const route = useRoute()
const { isScrolled } = useScrolled()

const isMenuOpen = ref(false)
const menuPanel = useTemplateRef<HTMLElement>('menuPanel')
const toggleButton = useTemplateRef<HTMLButtonElement>('toggleButton')

const primaryItems = computed(() =>
  PRIMARY_ITEMS.map((item) => ({ ...item, label: t(`nav.${item.key}`) })),
)

const mobileOnlyItems = computed(() =>
  MOBILE_ONLY_ITEMS.map((item) => ({ ...item, label: t(`nav.${item.key}`) })),
)

/** /work/eson-web 也应让 WORK 处于 active 状态 */
function isActiveRoute(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

function navItemClasses(to: string) {
  return cn(
    'link-underline type-meta transition-colors duration-[var(--duration-micro)] ease-[var(--ease-out)] hover:text-ink',
    isActiveRoute(to) ? 'text-ink' : 'text-ink-secondary',
  )
}

const headerClasses = computed(() =>
  cn(
    'sticky top-0 z-[var(--z-header)] w-full border-b transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)]',
    isScrolled.value
      ? 'border-line bg-background/80 backdrop-blur-md'
      : 'border-transparent bg-transparent',
  ),
)

const barClasses = computed(() =>
  cn(
    'flex items-center justify-between gap-6 transition-[padding] duration-[var(--duration-ui)] ease-[var(--ease-out)]',
    isScrolled.value ? 'py-3' : 'py-5',
  ),
)

function openMenu() {
  isMenuOpen.value = true
}

function closeMenu() {
  isMenuOpen.value = false
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function handlePanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
    return
  }

  if (event.key !== 'Tab' || !menuPanel.value) {
    return
  }

  const focusable = Array.from(
    menuPanel.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )

  const first = focusable.at(0)
  const last = focusable.at(-1)

  if (!first || !last) {
    return
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
    return
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(isMenuOpen, async (isOpen) => {
  if (!import.meta.client) {
    return
  }

  document.documentElement.style.overflow = isOpen ? 'hidden' : ''

  if (isOpen) {
    await nextTick()
    const firstFocusable = menuPanel.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(firstFocusable ?? menuPanel.value)?.focus()
    return
  }

  toggleButton.value?.focus()
})

watch(
  () => route.fullPath,
  () => closeMenu(),
)

onScopeDispose(() => {
  if (import.meta.client) {
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <header :class="headerClasses">
    <AppContainer width="page">
      <div :class="barClasses">
        <NuxtLink
          :aria-label="t('nav.home')"
          class="type-small font-semibold uppercase tracking-[0.18em] text-ink"
          to="/"
        >
          ESON
        </NuxtLink>

        <nav :aria-label="t('nav.primaryLabel')" class="hidden items-center gap-8 tablet:flex">
          <NuxtLink
            v-for="item in primaryItems"
            :key="item.key"
            :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
            :class="navItemClasses(item.to)"
            :to="item.to"
            data-underline="collapsed"
          >
            {{ item.label }}
          </NuxtLink>
          <LanguageSwitcher />
        </nav>

        <button
          ref="toggleButton"
          :aria-expanded="isMenuOpen"
          aria-controls="site-menu-panel"
          class="type-meta min-h-11 text-ink-secondary tablet:hidden"
          type="button"
          @click="toggleMenu"
        >
          {{ isMenuOpen ? t('nav.close') : t('nav.menu') }}
        </button>
      </div>
    </AppContainer>

    <Transition name="menu">
      <div
        v-if="isMenuOpen"
        id="site-menu-panel"
        ref="menuPanel"
        :aria-label="t('nav.mobileLabel')"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-overlay)] bg-background-secondary/95 backdrop-blur-lg tablet:hidden"
        role="dialog"
        tabindex="-1"
        @keydown="handlePanelKeydown"
      >
        <div class="flex min-h-dvh flex-col">
          <div class="flex items-center justify-between py-5">
            <AppContainer width="page" class="flex items-center justify-between">
              <span class="type-small font-semibold uppercase tracking-[0.18em]">ESON</span>
              <button
                class="type-meta min-h-11 text-ink-secondary"
                type="button"
                @click="closeMenu"
              >
                {{ t('nav.close') }}
              </button>
            </AppContainer>
          </div>

          <AppContainer width="page" class="flex flex-1 flex-col justify-between pb-10">
            <nav :aria-label="t('nav.mobileLabel')" class="flex flex-col gap-5 pt-6">
              <NuxtLink
                v-for="item in [...primaryItems, ...mobileOnlyItems]"
                :key="item.key"
                :to="item.to"
                :class="
                  cn(
                    'link-underline type-h3 w-fit',
                    isActiveRoute(item.to) ? 'text-ink' : 'text-ink-secondary',
                  )
                "
                :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
                data-underline="collapsed"
              >
                {{ item.label }}
              </NuxtLink>
            </nav>

            <LanguageSwitcher />
          </AppContainer>
        </div>
      </div>
    </Transition>
  </header>
</template>
