<script setup lang="ts">
import type { AboutFocusContent } from '~/types/about'

const { focus } = defineProps<{
  focus: AboutFocusContent
}>()

const { t } = useI18n()
</script>

<template>
  <AppSection labelled-by="about-focus-heading" spacing="sm">
    <div class="flex flex-col gap-8">
      <AppSectionHeader
        id="about-focus-heading"
        index="04"
        :lede="focus.lede"
        :title="focus.title"
      />

      <EmptyState
        v-if="focus.placeholder || focus.items.length === 0"
        :hint="t('about.focusPlaceholderHint')"
        :message="t('about.focusPlaceholder')"
      />

      <ul v-else class="flex flex-wrap gap-x-8 gap-y-4">
        <li v-for="item in focus.items" :key="item.id" class="flex flex-col gap-2">
          <p class="type-body text-ink">{{ item.label }}</p>
          <p v-if="item.description" class="type-small text-ink-muted">
            {{ item.description }}
          </p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
