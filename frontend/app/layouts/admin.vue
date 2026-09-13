<script setup lang="ts">
const { t } = useI18n()

const isNavOpen = ref(false)
const drawer = useTemplateRef<HTMLElement>('drawer')

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function openNav() {
  isNavOpen.value = true
  await nextTick()
  drawer.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
}

function closeNav() {
  isNavOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeNav()
  }
}

watch(isNavOpen, (open) => {
  if (import.meta.client) {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

onScopeDispose(() => {
  if (import.meta.client) {
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <div class="flex min-h-dvh bg-background text-ink">
    <a class="skip-link type-small" href="#admin-main">{{ t('a11y.skipToContent') }}</a>

    <AdminSidebar class="hidden desktop:flex" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AdminHeader @open-nav="openNav" />

      <main id="admin-main" class="flex-1 px-6 py-10" tabindex="-1">
        <slot />
      </main>
    </div>

    <Transition name="menu">
      <div
        v-if="isNavOpen"
        aria-modal="true"
        class="fixed inset-0 z-[var(--z-overlay)] flex bg-background/80 backdrop-blur-sm desktop:hidden"
        role="dialog"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <div ref="drawer" class="h-full">
          <AdminSidebar variant="drawer" @close="closeNav" />
        </div>
      </div>
    </Transition>
  </div>
</template>
