<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background text-ink">
    <a class="skip-link type-small" href="#main">{{ t('a11y.skipToContent') }}</a>

    <SiteNavigation />

    <main id="main" class="flex-1" tabindex="-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
