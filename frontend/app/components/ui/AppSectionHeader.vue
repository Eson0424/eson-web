<script setup lang="ts">
const {
  index,
  total,
  kicker,
  title,
  lede,
  level = 2,
  id,
} = defineProps<{
  /** 章节序号，例如 01（DESIGN §12 的编辑式编号） */
  index?: string
  /** 章节总数，例如 05；与 index 共同构成 01 / 05 */
  total?: string
  /** 章节标签，例如 WORK */
  kicker?: string
  title: string
  lede?: string
  /** 每个页面只应有一个 h1；章节标题使用 h2/h3 */
  level?: 1 | 2 | 3
  id?: string
}>()

const headingTag = computed(() => `h${level}`)

const HEADING_CLASSES = {
  1: 'type-h1',
  2: 'type-h2',
  3: 'type-h3',
} as const

const headingClass = computed(() => HEADING_CLASSES[level])
const hasMeta = computed(() => Boolean(index || kicker))
</script>

<template>
  <header class="flex flex-col gap-4">
    <p v-if="hasMeta" class="type-meta text-ink-muted">
      <span v-if="index">{{ index }}</span>
      <span v-if="index && total"> / {{ total }}</span>
      <span v-else-if="index" aria-hidden="true" />
      <span v-if="kicker" :class="cn(index && 'ml-2')">{{ kicker }}</span>
    </p>

    <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <component :is="headingTag" :id="id" :class="headingClass">
        {{ title }}
      </component>
      <slot name="actions" />
    </div>

    <p v-if="lede" :class="cn('type-body type-body-secondary type-reading-width')">
      {{ lede }}
    </p>
  </header>
</template>
