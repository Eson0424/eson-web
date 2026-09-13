<script setup lang="ts">
import type { LabSummary } from '~/types/lab'

const { experiment, index, variant = 'row' } = defineProps<{
  experiment: LabSummary
  index: number
  /** row：首页与列表中的常规条目；specimen：Featured 实验的展示块 */
  variant?: 'row' | 'specimen'
}>()

const { t } = useI18n()

const displayIndex = computed(() => `LAB ${String(index).padStart(2, '0')}`)
const statusLabel = computed(() => t(`lab.status.${experiment.status}`))
const meta = computed(() =>
  [experiment.technologies.join(' · '), experiment.year].filter(Boolean).join(' · '),
)
const isSpecimen = computed(() => variant === 'specimen')
</script>

<template>
  <article
    v-if="isSpecimen"
    class="group flex flex-col gap-8 border-t border-line pt-8 pb-14 transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:border-accent/50 desktop:pt-10 desktop:pb-20"
  >
    <header class="type-meta flex items-center justify-between gap-4 text-ink-muted">
      <span class="flex flex-wrap items-center gap-3">
        <span class="text-ink">{{ displayIndex }}</span>
        <AppBadge tone="accent" uppercase>{{ statusLabel }}</AppBadge>
        <AppBadge v-if="experiment.featured" tone="outline" uppercase>
          {{ t('lab.featured') }}
        </AppBadge>
      </span>
      <span v-if="experiment.year" class="font-mono">{{ experiment.year }}</span>
    </header>

    <div class="grid gap-8 desktop:grid-cols-12 desktop:items-start desktop:gap-10">
      <div class="desktop:col-span-7">
        <div v-reveal="{ variant: 'clip' }" class="specimen-frame rounded-md border border-line p-3">
          <PublicCover
            :alt-fallback="experiment.title"
            :cover="experiment.cover"
            :placeholder-label="t('common.visualPlaceholder', { title: experiment.title })"
            ratio="16 / 10"
            :seed="index"
            class="transition-transform duration-[var(--duration-content)] ease-[var(--ease-out)] desktop:group-hover:scale-[1.02]"
          />
        </div>
      </div>

      <div v-reveal="{ delay: 90 }" class="flex flex-col gap-5 desktop:col-span-5">
        <div class="flex flex-col gap-2">
          <h3 class="type-h3">{{ experiment.title }}</h3>
          <p v-if="experiment.subtitle" class="type-small text-ink-muted">
            {{ experiment.subtitle }}
          </p>
        </div>

        <p class="type-body type-body-secondary">{{ experiment.summary }}</p>

        <ul v-if="experiment.technologies.length > 0" class="flex flex-wrap gap-2">
          <li v-for="technology in experiment.technologies" :key="technology">
            <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
          </li>
        </ul>

        <AppLink :to="`/lab/${experiment.slug}`" arrow class="type-small w-fit">
          {{ t('lab.viewExperiment') }}
        </AppLink>
      </div>
    </div>
  </article>

  <article
    v-else
    v-reveal="{ delay: Math.min((index - 1) * 40, 160) }"
    class="group border-t border-line py-7 transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:border-accent/50 desktop:py-9"
  >
    <div class="grid gap-4 desktop:grid-cols-12 desktop:gap-6">
      <p class="type-meta text-ink-muted desktop:col-span-2">{{ displayIndex }}</p>

      <div class="flex flex-col gap-3 desktop:col-span-7">
        <h3 class="type-h3">
          <AppLink :to="`/lab/${experiment.slug}`" underline="collapsed">
            {{ experiment.title }}
          </AppLink>
        </h3>
        <p v-if="experiment.subtitle" class="type-small text-ink-muted">
          {{ experiment.subtitle }}
        </p>
        <p class="type-small text-ink-secondary">{{ experiment.summary }}</p>
      </div>

      <div class="flex flex-col gap-3 desktop:col-span-3 desktop:items-end">
        <AppBadge tone="outline" uppercase>{{ statusLabel }}</AppBadge>
        <p class="type-meta text-ink-muted desktop:text-right">{{ meta }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Specimen 外框：以极淡的内描边与网格角落标记区分于 Work 的整幅视觉。 */
.specimen-frame {
  background:
    linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 24px 24px;
}
</style>
