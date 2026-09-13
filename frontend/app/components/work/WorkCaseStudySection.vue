<script setup lang="ts">
import type { WorkCaseStudySection as WorkSectionContent } from '~/types/work'

const { section, index, technologies } = defineProps<{
  section: WorkSectionContent
  /** 1-based 章节序号（DESIGN §12 编辑式编号） */
  index: number
  /** kind === 'technology' 时渲染该 Work 的技术栈 */
  technologies?: string[]
}>()

const headingId = computed(() => `${section.id}-heading`)
const displayIndex = computed(() => String(index).padStart(2, '0'))
const showTechnologies = computed(
  () => section.kind === 'technology' && Boolean(technologies?.length),
)
</script>

<template>
  <AppSection :id="section.id" :labelled-by="headingId" spacing="sm">
    <div class="flex flex-col gap-8">
      <AppSectionHeader
        :id="headingId"
        :index="displayIndex"
        :title="section.title"
      />

      <div v-reveal class="flex flex-col gap-6">
        <ProseContent :bullets="section.bullets" :paragraphs="section.paragraphs" />

        <ul v-if="showTechnologies" class="flex flex-wrap gap-2">
          <li v-for="technology in technologies" :key="technology">
            <AppBadge tone="neutral" uppercase>{{ technology }}</AppBadge>
          </li>
        </ul>
      </div>
    </div>
  </AppSection>
</template>
