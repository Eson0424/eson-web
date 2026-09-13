<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{
  error: NuxtError
}>()

const { locale, t } = useI18n()

const ERROR_LINKS = [
  { to: '/work', key: 'work' },
  { to: '/lab', key: 'lab' },
  { to: '/writing', key: 'writing' },
] as const

const statusCode = computed(() => error?.statusCode ?? 500)
const isNotFound = computed(() => statusCode.value === 404)

const title = computed(() =>
  isNotFound.value ? t('error.notFoundTitle') : t('error.genericTitle'),
)
const message = computed(() =>
  isNotFound.value ? t('error.notFoundMessage') : t('error.genericMessage'),
)

function backToHome() {
  void clearError({ redirect: '/' })
}

useSeoMeta({
  title: () => `${statusCode.value} — ESON`,
  robots: 'noindex, nofollow',
})

// 错误页不在 app.vue 内渲染，需要自行声明 <html lang>（无障碍与 SEO 必需）。
useHead({
  htmlAttrs: {
    lang: () => locale.value,
  },
})
</script>

<template>
  <NuxtLayout>
    <AppSection labelled-by="error-heading" spacing="md">
      <div class="flex flex-col gap-8 pb-8 pt-16 desktop:pt-24">
        <p class="type-meta text-ink-secondary">
          [ {{ statusCode }} ]<span v-if="isNotFound" class="ml-2">/ Not found</span>
        </p>

        <h1 id="error-heading" class="type-display uppercase">{{ title }}</h1>

        <p class="type-body type-body-secondary type-reading-width">{{ message }}</p>

        <div class="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
          <AppButton variant="primary" @click="backToHome">
            {{ t('error.backHome') }}
          </AppButton>

          <AppLink
            v-for="link in ERROR_LINKS"
            :key="link.to"
            :to="link.to"
            arrow
            class="type-small"
          >
            {{ t(`error.${link.key}`) }}
          </AppLink>
        </div>
      </div>
    </AppSection>
  </NuxtLayout>
</template>
