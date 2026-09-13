<script setup lang="ts">
import type { WritingContentBlock } from '~/types/writing'

const { blocks } = defineProps<{
  blocks: WritingContentBlock[]
}>()
</script>

<template>
  <div class="flex flex-col gap-8">
    <template v-for="block in blocks" :key="block.id">
      <p
        v-if="block.kind === 'paragraph'"
        class="type-body type-body-secondary type-reading-width"
      >
        <WritingInlineText :text="block.text" />
      </p>

      <h2
        v-else-if="block.kind === 'heading' && block.level === 2"
        :id="block.id"
        class="type-h3 type-reading-width pt-4"
      >
        <WritingInlineText :text="block.text" />
      </h2>

      <h3
        v-else-if="block.kind === 'heading'"
        :id="block.id"
        class="type-body type-reading-width pt-2 font-medium text-ink"
      >
        <WritingInlineText :text="block.text" />
      </h3>

      <ul
        v-else-if="block.kind === 'list'"
        class="type-body type-body-secondary type-reading-width flex flex-col gap-3"
      >
        <li v-for="item in block.items" :key="item" class="relative pl-5">
          <span aria-hidden="true" class="absolute left-0 text-ink-muted">—</span>
          <WritingInlineText :text="item" />
        </li>
      </ul>

      <blockquote
        v-else-if="block.kind === 'quote'"
        class="type-reading-width border-l border-line-strong pl-6"
      >
        <p class="type-body text-ink-secondary"><WritingInlineText :text="block.text" /></p>
        <footer v-if="block.attribution" class="type-meta mt-3 text-ink-muted">
          {{ block.attribution }}
        </footer>
      </blockquote>

      <figure v-else-if="block.kind === 'code'" class="type-reading-width flex flex-col gap-3">
        <pre
          class="overflow-x-auto rounded-md border border-line bg-surface p-4 leading-relaxed"
        ><code class="font-mono type-small text-ink-secondary">{{ block.code }}</code></pre>
        <figcaption v-if="block.language" class="type-meta text-ink-muted">
          {{ block.language }}
        </figcaption>
      </figure>
    </template>
  </div>
</template>
