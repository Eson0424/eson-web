<script setup lang="ts">
const { title } = defineProps<{
  title: string
}>()

const { t } = useI18n()

// 占位页同样需要文档标题与 h1，否则 axe 报 document-title / page-has-heading-one。
useSeoMeta({
  title: () => `${title} — ESON`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <section class="flex flex-col gap-4 rounded-md border border-line bg-surface/40 p-8">
    <h1 class="type-h3">{{ title }}</h1>
    <p class="type-body type-ink-secondary text-ink-secondary">
      {{ t('admin.placeholder.body') }}
    </p>
    <p class="type-meta text-ink-muted">{{ t('admin.placeholder.hint') }}</p>
  </section>
</template>
