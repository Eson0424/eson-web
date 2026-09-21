<script setup lang="ts">
import type { ContactMessageStatus } from '~/services/admin-message.service'
import {
  MESSAGE_STATUS_FILTERS,
  useAdminMessages,
  type MessageStatusFilter,
} from '~/composables/useAdminMessages'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const {
  query,
  items,
  meta,
  status,
  refresh,
  selectedId,
  selected,
  isUpdating,
  updateErrorKey,
  setFilter,
  setStatus,
} = useAdminMessages()

useSeoMeta({ title: () => `${t('admin.nav.messages')} — ESON`, robots: 'noindex, nofollow' })

function filterLabel(value: MessageStatusFilter) {
  return value ? t(`admin.messages.status.${value}`) : t('admin.messages.all')
}

function statusLabel(value: ContactMessageStatus) {
  return t(`admin.messages.status.${value}`)
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <h1 class="type-h3">{{ t('admin.messages.listTitle') }}</h1>
      <p class="type-small text-ink-secondary">{{ t('admin.messages.listLede') }}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="type-meta mr-1 text-ink-muted">{{ t('admin.messages.filterStatus') }}</span>
      <AppButton
        v-for="value in MESSAGE_STATUS_FILTERS"
        :key="value || 'ALL'"
        :aria-pressed="query.status === value"
        :variant="query.status === value ? 'primary' : 'secondary'"
        size="sm"
        @click="setFilter(value)"
      >
        {{ filterLabel(value) }}
      </AppButton>
    </div>

    <LoadingState v-if="status === 'pending'" :message="t('admin.messages.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :hint="t('states.errorHint')"
      :message="t('admin.messages.loadError')"
      :retry-label="t('states.retry')"
      @retry="refresh()"
    />

    <EmptyState
      v-else-if="items.length === 0"
      :hint="t('admin.messages.emptyHint')"
      :message="t('admin.messages.empty')"
    />

    <div v-else class="grid gap-8 desktop:grid-cols-12 desktop:gap-6">
      <div class="flex flex-col gap-4 desktop:col-span-5">
        <h2 class="sr-only">{{ t('admin.messages.listLabel') }}</h2>

        <ul class="border-t border-line">
          <li v-for="item in items" :key="item.id">
            <button
              :aria-current="item.id === selectedId ? 'true' : undefined"
              :class="
                cn(
                  'flex w-full flex-col gap-1.5 border-b border-line px-3 py-4 text-left transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:bg-surface',
                  item.id === selectedId && 'bg-surface',
                )
              "
              type="button"
              @click="selectedId = item.id"
            >
              <span class="flex items-start gap-2">
                <span
                  v-if="item.status === 'UNREAD'"
                  aria-hidden="true"
                  class="mt-1.5 size-1.5 shrink-0 rounded-full bg-status-online"
                />
                <span class="type-small text-ink">
                  {{ item.subject || t('admin.messages.noSubject') }}
                </span>
              </span>

              <span class="flex flex-wrap items-center gap-2">
                <AppBadge :tone="item.status === 'UNREAD' ? 'accent' : 'neutral'">
                  {{ statusLabel(item.status) }}
                </AppBadge>
                <span class="type-meta text-ink-muted">
                  {{ item.name }} · {{ item.createdAt.slice(0, 10) }}
                </span>
              </span>
            </button>
          </li>
        </ul>

        <div v-if="meta && meta.totalPages > 1" class="flex flex-wrap items-center gap-4">
          <AppButton
            :disabled="query.page <= 1"
            size="sm"
            variant="secondary"
            @click="query.page = Math.max(1, query.page - 1)"
          >
            {{ t('admin.messages.previous') }}
          </AppButton>
          <p class="type-meta text-ink-muted">
            {{ t('admin.messages.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total }) }}
          </p>
          <AppButton
            :disabled="query.page >= meta.totalPages"
            size="sm"
            variant="secondary"
            @click="query.page = Math.min(meta.totalPages, query.page + 1)"
          >
            {{ t('admin.messages.next') }}
          </AppButton>
        </div>
      </div>

      <div class="desktop:col-span-7">
        <section v-if="selected" class="flex flex-col gap-6 rounded-md border border-line bg-surface/40 p-6">
          <header class="flex flex-col gap-2">
            <h2 class="type-h3">{{ selected.subject || t('admin.messages.noSubject') }}</h2>
            <p class="type-meta text-ink-muted">
              {{ t('admin.messages.from') }}: {{ selected.name }} &lt;{{ selected.email }}&gt;
            </p>
            <p class="type-meta text-ink-muted">
              {{ t('admin.messages.receivedAt') }}: {{ selected.createdAt.slice(0, 10) }}
            </p>
          </header>

          <div class="flex flex-col gap-2">
            <h3 class="type-meta text-ink-secondary">{{ t('admin.messages.messageBody') }}</h3>
            <!-- 访客输入按纯文本渲染（不解析 HTML），保留原始换行 -->
            <p class="type-body whitespace-pre-wrap break-words">{{ selected.message }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <AppButton
              v-if="selected.status !== 'READ'"
              :disabled="isUpdating"
              size="sm"
              @click="setStatus('READ')"
            >
              {{ t('admin.messages.markRead') }}
            </AppButton>

            <AppButton
              v-if="selected.status !== 'UNREAD'"
              :disabled="isUpdating"
              size="sm"
              @click="setStatus('UNREAD')"
            >
              {{ t('admin.messages.markUnread') }}
            </AppButton>

            <AppButton
              v-if="selected.status !== 'ARCHIVED'"
              :disabled="isUpdating"
              size="sm"
              variant="ghost"
              @click="setStatus('ARCHIVED')"
            >
              {{ t('admin.messages.archive') }}
            </AppButton>

            <AppButton v-else :disabled="isUpdating" size="sm" variant="ghost" @click="setStatus('READ')">
              {{ t('admin.messages.unarchive') }}
            </AppButton>

            <p v-if="isUpdating" class="type-meta text-ink-muted">
              {{ t('admin.messages.updating') }}
            </p>
          </div>

          <p v-if="updateErrorKey" class="type-small text-status-busy" role="alert">
            {{ t(updateErrorKey) }}
          </p>
        </section>

        <p v-else class="type-small text-ink-muted">{{ t('admin.messages.selectHint') }}</p>
      </div>
    </div>
  </div>
</template>
