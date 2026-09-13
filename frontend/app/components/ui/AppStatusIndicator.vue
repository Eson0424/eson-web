<script setup lang="ts">
const {
  state = 'offline',
  size = 'md',
  pulse = false,
  label,
} = defineProps<{
  state?: 'online' | 'busy' | 'offline'
  size?: 'sm' | 'md'
  /** 仅在真实存在持续状态时开启；避免制造虚假状态（DESIGN §34） */
  pulse?: boolean
  /** 状态必须同时有文字表达，不能只依赖颜色（AGENTS §20） */
  label: string
}>()

const DOT_CLASSES = {
  online: 'bg-status-online',
  busy: 'bg-status-busy',
  offline: 'bg-status-offline',
} as const

const dotClass = computed(() => cn('relative size-2 rounded-full', DOT_CLASSES[state]))
const textClass = computed(() => (size === 'sm' ? 'type-meta' : 'type-small'))
</script>

<template>
  <p class="inline-flex items-center gap-2">
    <span aria-hidden="true" class="inline-flex size-2 items-center justify-center">
      <span :class="dotClass" />
      <span
        v-if="pulse && state === 'online'"
        class="absolute size-2 animate-ping rounded-full bg-status-online/50"
      />
    </span>
    <span :class="cn(textClass, 'text-ink-secondary')">{{ label }}</span>
  </p>
</template>
