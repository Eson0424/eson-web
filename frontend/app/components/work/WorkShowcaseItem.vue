<script setup lang="ts">
import type { WorkSummary } from '~/types/content'

const { work, index, variant = 'full' } = defineProps<{
  work: WorkSummary
  /** 1-based 序号，用于编辑式编号（01、02…） */
  index: number
  /** full：首页与 Featured 项目；compact：/work 列表中的其余项目 */
  variant?: 'full' | 'compact'
}>()

const { t } = useI18n()

const displayIndex = computed(() => String(index).padStart(2, '0'))
const isReversed = computed(() => index % 2 === 0)
const categories = computed(() => work.categories.join(' · '))
const isFeatured = computed(() => Boolean(work.featured))
const isCompact = computed(() => variant === 'compact')
const visualRatio = computed(() => (isCompact.value ? '16 / 9' : '16 / 10'))
</script>

<template>
  <article
    :class="cn(
      'group border-t border-line transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:border-accent/50',
      isCompact ? 'pt-7 pb-12 desktop:pt-8 desktop:pb-14' : 'pt-8 pb-14 desktop:pt-10 desktop:pb-20',
    )"
  >
    <header class="type-meta flex items-center justify-between gap-4 text-ink-muted">
      <span class="flex items-center gap-3">
        <span class="text-ink">{{ displayIndex }}</span>
        <span aria-hidden="true">/</span>
        <span v-if="work.year">{{ work.year }}</span>
        <AppBadge v-if="isFeatured" tone="accent" uppercase>{{ t('work.featured') }}</AppBadge>
      </span>
      <span v-if="categories">{{ categories }}</span>
    </header>

    <div class="mt-8 grid gap-8 desktop:grid-cols-12 desktop:items-start desktop:gap-10">
      <div
        :class="cn('desktop:col-span-7', isReversed && 'desktop:order-2')"
      >
        <div v-reveal="{ variant: 'clip' }">
          <PublicCover
            :alt-fallback="work.title"
            :cover="work.cover"
            :placeholder-label="t('common.visualPlaceholder', { title: work.title })"
            :ratio="visualRatio"
            :seed="index"
            class="transition-transform duration-[var(--duration-content)] ease-[var(--ease-out)] desktop:group-hover:scale-[1.02]"
          />
        </div>
      </div>

      <div
        v-reveal="{ delay: 90 }"
        :class="cn(
          'flex flex-col gap-5 desktop:col-span-5',
          isReversed && 'desktop:order-1',
        )"
      >
        <div class="flex flex-col gap-2">
          <h3 class="type-h3">{{ work.title }}</h3>
          <p v-if="work.subtitle" class="type-small text-ink-muted">{{ work.subtitle }}</p>
        </div>

        <p class="type-body type-body-secondary">{{ work.summary }}</p>

        <ul v-if="work.technologies.length > 0" class="flex flex-wrap gap-2">
          <li v-for="technology in work.technologies" :key="technology">
            <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
          </li>
        </ul>

        <AppLink :to="`/work/${work.slug}`" arrow class="type-small w-fit">
          {{ t('work.viewCaseStudy') }}
        </AppLink>
      </div>
    </div>
  </article>
</template>
