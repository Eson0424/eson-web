<script setup lang="ts">
import { CONTACT_EMAIL } from '~/data/contact'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background text-ink">
    <a class="skip-link type-small" href="#main">{{ t('a11y.skipToContent') }}</a>

    <SiteNavigation />

    <main id="main" class="flex-1" tabindex="-1">
      <slot />
    </main>

    <!-- 只传真实存在的方式：GitHub / LinkedIn 未提供，因此不传（AGENTS §45） -->
    <SiteFooter :email="CONTACT_EMAIL" />
  </div>
</template>
