<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'admin-auth' })

const { t } = useI18n()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const status = ref<'idle' | 'submitting' | 'error'>('idle')
const errorMessage = ref<string | null>(null)

useSeoMeta({
  title: () => `${t('admin.login.title')} — ESON`,
  robots: 'noindex, nofollow',
})

async function handleSubmit() {
  if (!email.value.trim() || !password.value) {
    status.value = 'error'
    errorMessage.value = t('admin.login.required')
    return
  }

  status.value = 'submitting'
  errorMessage.value = null

  const success = await auth.login(email.value.trim(), password.value)

  if (!success) {
    status.value = 'error'
    errorMessage.value =
      auth.errorCode === 'INVALID_CREDENTIALS' ? t('admin.login.invalid') : t('admin.login.unavailable')
    return
  }

  status.value = 'idle'
  await navigateTo('/admin')
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-ink">
    <div class="flex w-full max-w-md flex-col gap-8">
      <div class="flex flex-col gap-3">
        <p class="type-small font-semibold uppercase tracking-[0.18em]">ESON · Admin</p>
        <h1 class="type-h3">{{ t('admin.login.title') }}</h1>
        <p class="type-small text-ink-secondary">{{ t('admin.login.lede') }}</p>
      </div>

      <form class="flex flex-col gap-6" novalidate @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-2">
          <label class="type-meta text-ink-secondary" for="admin-email">
            {{ t('admin.login.email') }}
          </label>
          <input
            id="admin-email"
            v-model="email"
            autocomplete="username"
            class="min-h-11 w-full rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
            name="email"
            required
            type="email"
          >
        </div>

        <div class="flex flex-col gap-2">
          <label class="type-meta text-ink-secondary" for="admin-password">
            {{ t('admin.login.password') }}
          </label>
          <input
            id="admin-password"
            v-model="password"
            autocomplete="current-password"
            class="min-h-11 w-full rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink"
            name="password"
            required
            type="password"
          >
        </div>

        <p v-if="errorMessage" class="type-small text-status-busy" role="alert">
          <span aria-hidden="true" class="mr-2">!</span>{{ errorMessage }}
        </p>

        <AppButton :disabled="status === 'submitting'" type="submit" variant="primary">
          {{ status === 'submitting' ? t('admin.login.submitting') : t('admin.login.submit') }}
        </AppButton>
      </form>

      <AppLink class="type-small w-fit" to="/">{{ t('admin.login.backToSite') }}</AppLink>
    </div>
  </main>
</template>
