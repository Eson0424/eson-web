import { onScopeDispose, ref } from 'vue'

const SCROLL_THRESHOLD_PX = 24

/**
 * 判断页面是否已滚动超过阈值，用于导航栏状态（DESIGN §10.1）。
 * 使用 requestAnimationFrame 合并滚动事件，避免高频布局读取。
 */
export function useScrolled(threshold: number = SCROLL_THRESHOLD_PX) {
  const isScrolled = ref(false)

  if (!import.meta.client) {
    return { isScrolled }
  }

  let frame = 0

  const update = () => {
    frame = 0
    isScrolled.value = window.scrollY > threshold
  }

  const handleScroll = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(update)
    }
  }

  update()
  window.addEventListener('scroll', handleScroll, { passive: true })

  onScopeDispose(() => {
    window.removeEventListener('scroll', handleScroll)
    if (frame !== 0) {
      cancelAnimationFrame(frame)
    }
  })

  return { isScrolled }
}
