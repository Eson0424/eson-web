<script setup lang="ts">
// Phase 2A：Design System 内部预览页（临时）。
// 这里不是 Public 页面，只用于验证 tokens、排版、布局、UI primitives 与 motion。

const SURFACES = [
  { name: 'background', value: '#07080C', className: 'bg-background' },
  { name: 'background-secondary', value: '#0B0D12', className: 'bg-background-secondary' },
  { name: 'surface', value: '#10131A', className: 'bg-surface' },
  { name: 'surface-elevated', value: '#141820', className: 'bg-surface-elevated' },
] as const

const ACCENTS = [
  { name: 'accent', value: '#3D6BFF', className: 'bg-accent' },
  { name: 'accent-strong', value: '#2A4BD7', className: 'bg-accent-strong' },
  { name: 'accent-deep', value: '#6D4BFF', className: 'bg-accent-deep' },
] as const

const TYPE_SCALE = [
  { label: 'Display', className: 'type-display', sample: 'Software Engineer' },
  { label: 'H1', className: 'type-h1', sample: 'Software Engineer & Builder' },
  { label: 'H2', className: 'type-h2', sample: 'Selected work' },
  { label: 'H3', className: 'type-h3', sample: 'Interactive systems' },
  {
    label: 'Body',
    className: 'type-body',
    sample:
      'I build digital products, AI systems and interactive experiences. Engineering quality, content and accessibility come before visual effects.',
  },
  { label: 'Small', className: 'type-small', sample: 'Supporting detail and captions.' },
  { label: 'Meta', className: 'type-meta', sample: '2026 · Engineering' },
] as const

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#10131A"/><path d="M0 9L6 3l3 3 4-4 3 3v4z" fill="#1b2029"/></svg>',
  )

const { prefersReducedMotion } = useReducedMotion()

useSeoMeta({
  title: 'Design system (internal)',
  description: 'Internal preview of the Eson_web design system.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="section-space flex flex-col gap-[var(--spacing-section-md)]">
    <AppContainer class="flex flex-col gap-10" width="page">
      <AppSectionHeader
        index="01"
        kicker="Foundation"
        lede="Design tokens、排版、布局与 UI primitives 的内部预览。页面上所有值均来自 tokens.css，对应 docs/DESIGN.md。"
        :level="1"
        title="Design system"
      >
        <template #actions>
          <AppStatusIndicator label="Phase 2A foundation" state="online" />
        </template>
      </AppSectionHeader>

      <div class="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <div v-reveal class="relative h-40 overflow-hidden rounded-md bg-surface">
          <div
            class="absolute -right-10 -top-12 size-48 rounded-full bg-accent/12 blur-3xl"
            aria-hidden="true"
          />
          <div class="relative flex h-full flex-col justify-between p-6">
            <p class="type-meta text-ink-muted">Ambient light</p>
            <p class="type-h3">Dark, not black</p>
          </div>
        </div>

        <div v-reveal="{ delay: 80 }" class="flex h-40 flex-col justify-between rounded-md border border-line p-6">
          <p class="type-meta text-ink-muted">Type</p>
          <p class="type-h3">Inter · Noto Sans SC</p>
          <p class="type-small text-ink-secondary">
            中文与英文共用一套字族，中文单独调整行高与字距。
          </p>
        </div>

        <div v-reveal="{ delay: 160 }" class="flex h-40 flex-col justify-between rounded-md border border-line p-6">
          <p class="type-meta text-ink-muted">Motion</p>
          <p class="type-h3">Micro → Large</p>
          <p class="type-small text-ink-secondary">
            160ms / 260ms / 460ms / 800ms，全部遵循 prefers-reduced-motion。
          </p>
        </div>
      </div>
    </AppContainer>

    <AppContainer class="flex flex-col gap-8" width="page">
      <AppSectionHeader
        index="02"
        kicker="Color"
        lede="背景保持层级而非纯黑，强调色只用于状态、链接与关键操作。"
        title="Surfaces & accent"
      />

      <div class="grid-page grid-full gap-y-6">
        <div class="grid-full grid grid-cols-2 gap-4 tablet:grid-cols-4">
          <div v-for="surface in SURFACES" :key="surface.name" class="flex flex-col gap-3">
            <div :class="cn('h-24 rounded-md border border-line', surface.className)" />
            <div>
              <p class="type-small text-ink">{{ surface.name }}</p>
              <p class="type-meta text-ink-muted">{{ surface.value }}</p>
            </div>
          </div>
        </div>

        <div class="grid-full grid grid-cols-3 gap-4">
          <div v-for="accent in ACCENTS" :key="accent.name" class="flex flex-col gap-3">
            <div :class="cn('h-16 rounded-md', accent.className)" />
            <div>
              <p class="type-small text-ink">{{ accent.name }}</p>
              <p class="type-meta text-ink-muted">{{ accent.value }}</p>
            </div>
          </div>
        </div>
      </div>
    </AppContainer>

    <AppContainer class="flex flex-col gap-8" width="page">
      <AppSectionHeader
        index="03"
        kicker="Typography"
        lede="Desktop 与 Mobile 使用同一套 clamp 比例，中文行高单独放宽。"
        title="Type scale"
      />

      <div class="flex flex-col divide-y divide-[var(--color-line)]">
        <div
          v-for="item in TYPE_SCALE"
          :key="item.label"
          class="grid gap-4 py-6 desktop:grid-cols-12"
        >
          <p class="type-meta text-ink-muted desktop:col-span-2">{{ item.label }}</p>
          <p :class="cn(item.className, 'desktop:col-span-10')">{{ item.sample }}</p>
        </div>
      </div>
    </AppContainer>

    <AppContainer class="flex flex-col gap-8" width="page">
      <AppSectionHeader
        index="04"
        kicker="Primitives"
        lede="Button、Link、Badge、StatusIndicator、SectionHeader 与 Image 的状态集合。"
        title="UI primitives"
      />

      <div class="grid gap-10 desktop:grid-cols-2">
        <div class="flex flex-col gap-4">
          <p class="type-meta text-ink-muted">Buttons</p>
          <div class="flex flex-wrap items-center gap-3">
            <AppButton variant="primary">View work</AppButton>
            <AppButton variant="secondary">Read writing</AppButton>
            <AppButton variant="ghost">Ghost</AppButton>
            <AppButton variant="text" arrow>Explore</AppButton>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <AppButton size="sm" variant="secondary">Small</AppButton>
            <AppButton size="lg" variant="primary">Large</AppButton>
            <AppButton disabled variant="secondary">Disabled</AppButton>
            <AppButton loading variant="secondary">Loading</AppButton>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <p class="type-meta text-ink-muted">Links & badges</p>
          <div class="flex flex-wrap items-center gap-6">
            <AppLink arrow to="/work">View work</AppLink>
            <AppLink href="https://example.com" underline="full">External link</AppLink>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <AppBadge tone="accent" uppercase>Nuxt</AppBadge>
            <AppBadge tone="neutral">Case study</AppBadge>
            <AppBadge tone="outline" uppercase>2026</AppBadge>
            <AppBadge tone="muted">Draft</AppBadge>
          </div>
          <div class="flex flex-wrap items-center gap-6">
            <AppStatusIndicator label="Available" state="online" />
            <AppStatusIndicator label="In progress" state="busy" />
            <AppStatusIndicator label="Offline" state="offline" size="sm" />
          </div>
        </div>

        <div class="flex flex-col gap-4 desktop:col-span-2">
          <p class="type-meta text-ink-muted">Image & reading width</p>
          <div class="grid gap-6 desktop:grid-cols-2">
            <AppImage
              alt=""
              caption="16 / 9 占位图（无真实素材前使用）"
              ratio="16 / 9"
              rounded
              :src="PLACEHOLDER_IMAGE"
            />
            <div class="type-reading-width">
              <p class="type-body type-body-secondary">
                正文宽度限制在 650–760px，保证行长不超过约 80 个字符，中英文混排也能保持舒适阅读。
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppContainer>

    <AppContainer class="flex flex-col gap-8" width="page">
      <AppSectionHeader
        index="05"
        kicker="Layout"
        lede="12 / 8 / 4 列栅格，容器最大宽度 1440px，内边距随断点变化（20 / 32 / 40 / 64px）。"
        title="Grid & container"
      />

      <div class="grid-page grid-full gap-y-3">
        <div
          v-for="column in 12"
          :key="column"
          class="col-span-4 h-16 rounded-sm border border-line bg-surface/60 tablet:col-span-4 desktop:col-span-1"
        />
      </div>
    </AppContainer>

    <AppContainer class="flex flex-col gap-8 pb-[var(--spacing-section-md)]" width="page">
      <AppSectionHeader
        index="06"
        kicker="Motion"
        lede="Reveal 由 v-reveal 指令驱动，只在内容进入视口时触发一次；开启 reduced motion 后直接显示。"
        title="Motion foundation"
      >
        <template #actions>
          <AppBadge :tone="prefersReducedMotion ? 'accent' : 'neutral'" uppercase>
            reduced motion {{ prefersReducedMotion ? 'on' : 'off' }}
          </AppBadge>
        </template>
      </AppSectionHeader>

      <div class="grid gap-4 tablet:grid-cols-3">
        <div
          v-for="(step, index) in ['Micro 160ms', 'UI 260ms', 'Content 460ms']"
          :key="step"
          v-reveal="{ delay: index * 90 }"
          class="flex flex-col gap-2 rounded-md border border-line bg-surface/60 p-6"
        >
          <p class="type-meta text-ink-muted">{{ step }}</p>
          <p class="type-body">transform + opacity only</p>
        </div>
      </div>
    </AppContainer>
  </div>
</template>
