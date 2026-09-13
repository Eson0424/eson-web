<script setup lang="ts">
const emit = defineEmits<{ openNav: [] }>()

const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-[var(--z-header)] border-b border-line bg-background/90 backdrop-blur-md">
    <div class="flex items-center justify-between gap-4 px-6 py-4">
      <button
        class="type-meta min-h-11 text-ink-secondary desktop:hidden"
        type="button"
        @click="emit('openNav')"
      >
        {{ t('admin.nav.open') }}
      </button>

      <p class="type-meta text-ink-muted desktop:block">{{ t('admin.header.label') }}</p>

      <LanguageSwitcher />
    </div>
  </header>
</template>
