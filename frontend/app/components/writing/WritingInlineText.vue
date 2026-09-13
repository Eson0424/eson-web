<script setup lang="ts">
import { parseWritingInline } from '~/utils/content'

const { text } = defineProps<{ text: string | null | undefined }>()

const nodes = computed(() => parseWritingInline(text))
</script>

<template>
  <template v-for="(node, index) in nodes" :key="index">
    <code v-if="node.kind === 'code'" class="font-mono type-small text-ink">{{ node.text }}</code>
    <strong v-else-if="node.kind === 'strong'" class="font-medium text-ink">{{ node.text }}</strong>
    <em v-else-if="node.kind === 'em'" class="italic">{{ node.text }}</em>
    <template v-else>{{ node.text }}</template>
  </template>
</template>
