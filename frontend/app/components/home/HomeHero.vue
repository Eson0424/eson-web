<script setup lang="ts">
import type { HeroContent } from '~/types/content'

const { hero } = defineProps<{
  hero: HeroContent
}>()

const { t } = useI18n()

const heroElement = useTemplateRef<HTMLElement>('heroElement')
const isPointerLightEnabled = ref(false)

let frame = 0

const ENTRY_BASE_DELAY_MS = 120
const ENTRY_STEP_DELAY_MS = 90

function entryDelay(step: number) {
  return `${ENTRY_BASE_DELAY_MS + step * ENTRY_STEP_DELAY_MS}ms`
}

function handlePointerMove(event: PointerEvent) {
  if (!isPointerLightEnabled.value || frame !== 0) {
    return
  }

  frame = requestAnimationFrame(() => {
    frame = 0

    const element = heroElement.value

    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    element.style.setProperty('--pointer-x', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    element.style.setProperty('--pointer-y', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  })
}

// 跟随光标的环境光只在桌面指针设备且未开启 reduced motion 时启用（DESIGN §11.3、§27）。
onMounted(() => {
  isPointerLightEnabled.value =
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onScopeDispose(() => {
  if (frame !== 0) {
    cancelAnimationFrame(frame)
  }
})
</script>

<template>
  <section
    ref="heroElement"
    aria-labelledby="hero-heading"
    class="relative isolate overflow-hidden"
    @pointermove="handlePointerMove"
  >
    <div aria-hidden="true" class="hero-backdrop pointer-events-none absolute inset-0" />
    <div aria-hidden="true" class="hero-grid pointer-events-none absolute inset-0" />
    <div
      aria-hidden="true"
      :class="cn('hero-pointer pointer-events-none absolute inset-0', isPointerLightEnabled && 'is-active')"
    />

    <div class="relative">
      <AppContainer width="page">
        <div
          class="flex min-h-[86svh] flex-col justify-between gap-14 pt-28 pb-12 desktop:min-h-[92svh] desktop:pt-36 desktop:pb-16"
        >
          <div class="flex flex-col gap-8">
            <p class="hero-item type-meta text-ink-secondary" :style="{ '--hero-delay': entryDelay(0) }">
              [ {{ hero.systemStatus.label }} ]
            </p>

            <div class="flex flex-col gap-4">
              <p
                class="hero-item type-small font-semibold tracking-[0.32em] text-ink-secondary uppercase"
                :style="{ '--hero-delay': entryDelay(1) }"
              >
                {{ hero.brand }}
              </p>

              <h1
                id="hero-heading"
                :aria-label="hero.headline.join(' ')"
                class="type-display uppercase"
              >
                <span
                  v-for="(line, index) in hero.headline"
                  :key="line"
                  :style="{ '--hero-delay': entryDelay(index + 2) }"
                  class="hero-item block"
                >
                  {{ line }}
                </span>
              </h1>
            </div>

            <p
              :style="{ '--hero-delay': entryDelay(hero.headline.length + 3) }"
              class="hero-item type-body type-body-secondary type-reading-width"
            >
              {{ hero.lead }}
            </p>
          </div>

          <div class="flex flex-col gap-8 tablet:flex-row tablet:items-end tablet:justify-between">
            <div
              :style="{ '--hero-delay': entryDelay(hero.headline.length + 4) }"
              class="hero-item flex flex-wrap items-center gap-6"
            >
              <AppStatusIndicator
                v-if="hero.availability"
                :label="hero.availability.label"
                :state="hero.availability.state"
              />

              <AppButton
                v-if="hero.primaryAction.to"
                :to="hero.primaryAction.to"
                variant="secondary"
              >
                {{ hero.primaryAction.label }}
              </AppButton>
            </div>

            <a
              :style="{ '--hero-delay': entryDelay(hero.headline.length + 5) }"
              class="hero-item type-meta flex items-center gap-3 text-ink-secondary transition-colors duration-[var(--duration-ui)] ease-[var(--ease-out)] hover:text-ink"
              href="#work"
            >
              <span>{{ t('home.explore') }}</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </AppContainer>
    </div>
  </section>
</template>

<style scoped>
.hero-backdrop {
  background:
    radial-gradient(120% 90% at 50% -10%, rgb(20 24 32 / 92%), transparent 58%),
    linear-gradient(180deg, #0b0d12 0%, #07080c 76%);
}

.hero-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: radial-gradient(90% 70% at 62% 18%, black, transparent 76%);
}

.hero-pointer {
  background: radial-gradient(
    640px circle at var(--pointer-x, 72%) var(--pointer-y, 18%),
    rgb(61 107 255 / 12%),
    transparent 62%
  );
  opacity: 0;
  transition: opacity var(--duration-large) var(--ease-out);
}

.hero-pointer.is-active {
  opacity: 1;
}

.hero-item {
  animation: hero-rise var(--duration-content) var(--ease-out) both;
  animation-delay: var(--hero-delay, 0ms);
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
