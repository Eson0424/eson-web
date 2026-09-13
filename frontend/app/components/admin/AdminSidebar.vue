<script setup lang="ts">
import { ADMIN_NAV_ITEMS, isAdminNavItemActive } from '~/utils/admin-nav'

const { variant = 'desktop' } = defineProps<{
  variant?: 'desktop' | 'drawer'
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const isDrawer = computed(() => variant === 'drawer')

async function handleLogout() {
  await auth.logout()
  await navigateTo('/admin/login')
}
</script>

<template>
  <aside
    :class="
      cn(
        'flex flex-col gap-8 border-line bg-background-secondary p-6',
        isDrawer ? 'h-full w-80 max-w-[85vw] border-r' : 'sticky top-0 h-dvh w-64 border-r',
      )
    "
  >
    <div class="flex items-center justify-between gap-4">
      <p class="type-small font-semibold uppercase tracking-[0.18em] text-ink">ESON · Admin</p>
      <button
        v-if="isDrawer"
        class="type-meta text-ink-secondary hover:text-ink"
        type="button"
        @click="emit('close')"
      >
        {{ t('admin.nav.close') }}
      </button>
    </div>

    <nav :aria-label="t('admin.nav.label')" class="flex-1">
      <ul class="flex flex-col gap-1">
        <li v-for="item in ADMIN_NAV_ITEMS" :key="item.key">
          <NuxtLink
            :aria-current="isAdminNavItemActive(route.path, item) ? 'page' : undefined"
            :class="
              cn(
                'type-small block rounded-sm px-3 py-2 transition-colors duration-[var(--duration-micro)]',
                isAdminNavItemActive(route.path, item)
                  ? 'bg-surface text-ink'
                  : 'text-ink-secondary hover:bg-surface/60 hover:text-ink',
              )
            "
            :to="item.to"
            @click="isDrawer && emit('close')"
          >
            {{ t(`admin.nav.${item.key}`) }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="flex flex-col gap-3 border-t border-line pt-4">
      <p class="type-meta text-ink-muted">{{ auth.user?.email ?? '' }}</p>
      <AppButton class="w-fit" variant="secondary" @click="handleLogout">
        {{ t('admin.nav.logout') }}
      </AppButton>
    </div>
  </aside>
</template>
