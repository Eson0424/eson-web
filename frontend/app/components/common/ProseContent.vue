<script setup lang="ts">
const { paragraphs, bullets } = defineProps<{
  paragraphs: string[]
  bullets?: string[]
}>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <p
      v-for="paragraph in paragraphs"
      :key="paragraph"
      class="type-body type-body-secondary type-reading-width"
    >
      {{ paragraph }}
    </p>

    <ul v-if="bullets && bullets.length > 0" class="flex flex-col gap-3">
      <li
        v-for="bullet in bullets"
        :key="bullet"
        class="type-body type-body-secondary type-reading-width relative pl-5"
      >
        <span aria-hidden="true" class="absolute left-0 text-ink-muted">—</span>
        {{ bullet }}
      </li>
    </ul>
  </div>
</template>
