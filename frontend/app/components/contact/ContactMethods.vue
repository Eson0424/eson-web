<script setup lang="ts">
import type { ContactMethodsContent } from '~/types/contact'

const { methods } = defineProps<{
  methods: ContactMethodsContent
}>()
</script>

<template>
  <AppSection labelled-by="contact-methods-heading" spacing="sm">
    <div class="flex flex-col gap-10">
      <AppSectionHeader
        id="contact-methods-heading"
        index="01"
        :lede="methods.lede"
        :title="methods.title"
      />

      <ul class="grid gap-x-10 gap-y-8 tablet:grid-cols-3">
        <li
          v-for="channel in methods.channels"
          :key="channel.id"
          v-reveal
          class="flex flex-col gap-3 border-t border-line pt-6"
        >
          <p class="type-meta text-ink-muted">{{ channel.label }}</p>

          <AppLink v-if="channel.href" :href="channel.href" class="type-small" external>
            {{ channel.value ?? channel.href }}
          </AppLink>

          <!-- 没有地址的渠道只显示已有文本；不会渲染“待配置”之类的占位说明 -->
          <p v-else-if="channel.value" class="type-small text-ink-secondary">{{ channel.value }}</p>
        </li>
      </ul>
    </div>
  </AppSection>
</template>
