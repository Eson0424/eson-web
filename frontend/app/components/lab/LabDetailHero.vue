<script setup lang="ts">
import type { LabDetail, LabLink } from '~/types/lab'
import { formatYearMonthOrDash } from '~/utils/date-display'

const { experiment, links } = defineProps<{
  experiment: LabDetail
  /** 仅包含真实存在的链接；无真实数据时为空数组 */
  links: LabLink[]
}>()

const { t } = useI18n()

const statusLabel = computed(() => t(`lab.status.${experiment.status}`))
</script>

<template>
  <header class="relative isolate overflow-hidden border-b border-line">
    <div aria-hidden="true" class="lab-backdrop pointer-events-none absolute inset-0" />
    <div aria-hidden="true" class="lab-grid pointer-events-none absolute inset-0" />

    <div class="relative">
      <AppContainer width="page">
        <div class="flex flex-col gap-10 pt-28 pb-14 desktop:pt-36 desktop:pb-20">
          <AppLink :to="'/lab'" class="type-meta w-fit text-ink-secondary">
            ← {{ t('lab.backToLab') }}
          </AppLink>

          <div class="flex flex-col gap-5">
            <p class="type-meta text-ink-secondary">
              <span>[ {{ t('lab.experimentLabel') }} ]</span>
              <span v-if="experiment.year" class="ml-2">/ {{ experiment.year }}</span>
            </p>

            <h1 class="type-h1">{{ experiment.title }}</h1>

            <p v-if="experiment.subtitle" class="type-h3 text-ink-secondary">
              {{ experiment.subtitle }}
            </p>

            <p class="type-body type-body-secondary type-reading-width">
              {{ experiment.summary }}
            </p>
          </div>

          <!-- 技术性 system metadata：Lab 特有的读表感（DESIGN §34） -->
          <dl
            class="grid gap-6 rounded-md border border-line bg-surface/40 p-6 tablet:grid-cols-4"
          >
            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('lab.statusLabel') }}</dt>
              <dd><AppStatusIndicator :label="statusLabel" state="busy" size="sm" /></dd>
            </div>

            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('lab.categoriesLabel') }}</dt>
              <dd class="font-mono type-small text-ink">
                {{ experiment.categories.join(' · ') || '—' }}
              </dd>
            </div>

            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('lab.technologyLabel') }}</dt>
              <dd>
                <ul class="flex flex-wrap gap-2">
                  <li v-for="technology in experiment.technologies" :key="technology">
                    <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
                  </li>
                </ul>
              </dd>
            </div>

            <div class="flex flex-col gap-3">
              <dt class="type-meta text-ink-muted">{{ t('lab.publishedLabel') }}</dt>
              <dd class="font-mono type-small text-ink">
                {{ formatYearMonthOrDash(experiment.publishedAt) }}
              </dd>
            </div>
          </dl>

          <LabLinks v-if="links.length > 0" :links="links" />

          <div class="specimen-frame rounded-md border border-line p-3">
            <PublicCover
              :alt-fallback="experiment.title"
              :cover="experiment.cover"
              :placeholder-label="t('common.visualPlaceholder', { title: experiment.title })"
              fetch-priority="high"
              loading="eager"
              ratio="16 / 9"
              :seed="2"
            />
          </div>
        </div>
      </AppContainer>
    </div>
  </header>
</template>

<style scoped>
.lab-backdrop {
  background:
    radial-gradient(90% 70% at 80% 0%, rgb(61 107 255 / 10%), transparent 58%),
    linear-gradient(180deg, #0b0d12 0%, #07080c 78%);
}

.lab-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 5%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 5%) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(80% 60% at 70% 6%, black, transparent 72%);
}

.specimen-frame {
  background:
    linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px;
}
</style>
