<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const { stats, status, refresh } = useAdminStats()

useSeoMeta({
  title: () => `${t('admin.dashboard.title')} — ESON`,
  robots: 'noindex, nofollow',
})

const cards = computed(() => {
  const data = stats.value

  if (!data) {
    return []
  }

  return [
    {
      key: 'publishedWork',
      label: t('admin.dashboard.publishedWork'),
      value: data.works.published,
      hint: t('admin.dashboard.drafts', { count: data.works.draft }),
    },
    {
      key: 'publishedLab',
      label: t('admin.dashboard.publishedLab'),
      value: data.labs.published,
      hint: t('admin.dashboard.drafts', { count: data.labs.draft }),
    },
    {
      key: 'publishedWriting',
      label: t('admin.dashboard.publishedWriting'),
      value: data.writings.published,
      hint: t('admin.dashboard.drafts', { count: data.writings.draft }),
    },
    {
      key: 'experiences',
      label: t('admin.dashboard.experiences'),
      value: data.experiences.total,
    },
    {
      key: 'unreadMessages',
      label: t('admin.dashboard.unreadMessages'),
      value: data.messages.unread,
      hint: t('admin.dashboard.totalMessages', { count: data.messages.total }),
    },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="type-h3">{{ t('admin.dashboard.title') }}</h1>
      <p class="type-small text-ink-secondary">{{ t('admin.dashboard.lede') }}</p>
    </div>

    <LoadingState v-if="status === 'pending'" :message="t('admin.dashboard.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.dashboard.error')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState v-else-if="cards.length === 0" :message="t('admin.dashboard.empty')" />

    <div v-else class="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
      <AdminStatCard
        v-for="card in cards"
        :key="card.key"
        :hint="card.hint"
        :label="card.label"
        :value="card.value"
      />
    </div>
  </div>
</template>
