<script setup lang="ts">
import type { WorkDetail } from '~/types/work'
import type { WorkLink } from '~/types/work'

const { work, links } = defineProps<{
  work: WorkDetail
  /** 仅包含真实存在的链接，缺失时为空数组（不虚构 GitHub / Demo） */
  links: WorkLink[]
}>()

const { t } = useI18n()

const period = computed(() => {
  const start = work.startDate?.slice(0, 4)
  const end = work.endDate === null ? t('common.present') : work.endDate?.slice(0, 4)

  return [start, end].filter(Boolean).join(' — ')
})
</script>

<template>
  <header class="relative isolate overflow-hidden border-b border-line">
    <div aria-hidden="true" class="detail-backdrop pointer-events-none absolute inset-0" />
    <div aria-hidden="true" class="detail-grid pointer-events-none absolute inset-0" />

    <div class="relative">
      <AppContainer width="page">
        <div class="flex flex-col gap-10 pt-28 pb-14 desktop:pt-36 desktop:pb-20">
          <AppLink :to="'/work'" class="type-meta w-fit text-ink-secondary">
            ← {{ t('work.backToWork') }}
          </AppLink>

          <div class="flex flex-col gap-5">
            <p class="type-meta text-ink-secondary">
              <span>[ {{ t('work.caseStudyLabel') }} ]</span>
              <span v-if="work.year" class="ml-2">/ {{ work.year }}</span>
            </p>

            <h1 class="type-h1">{{ work.title }}</h1>

            <p v-if="work.subtitle" class="type-h3 text-ink-secondary">{{ work.subtitle }}</p>

            <p class="type-body type-body-secondary type-reading-width">{{ work.summary }}</p>
          </div>

          <dl class="grid gap-8 border-t border-line pt-8 tablet:grid-cols-3">
            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('work.categoriesLabel') }}</dt>
              <dd class="type-small text-ink">{{ work.categories.join(' · ') || '—' }}</dd>
            </div>

            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('work.technologyLabel') }}</dt>
              <dd>
                <ul class="flex flex-wrap gap-2">
                  <li v-for="technology in work.technologies" :key="technology">
                    <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
                  </li>
                </ul>
              </dd>
            </div>

            <div v-if="period" class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('work.periodLabel') }}</dt>
              <dd class="type-small text-ink">{{ period }}</dd>
            </div>
          </dl>

          <WorkLinks v-if="links.length > 0" :links="links" />

          <PublicCover
            :alt-fallback="work.title"
            :cover="work.cover"
            :placeholder-label="t('common.visualPlaceholder', { title: work.title })"
            fetch-priority="high"
            loading="eager"
            ratio="16 / 9"
            :seed="1"
          />
        </div>
      </AppContainer>
    </div>
  </header>
</template>

<style scoped>
.detail-backdrop {
  background:
    radial-gradient(110% 80% at 20% -10%, rgb(20 24 32 / 90%), transparent 60%),
    linear-gradient(180deg, #0b0d12 0%, #07080c 78%);
}

.detail-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: radial-gradient(80% 60% at 30% 10%, black, transparent 78%);
}
</style>
