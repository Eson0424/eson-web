/**
 * 确认对话框的最小键盘支持（Phase 4-B）：
 * - Tab / Shift+Tab 在对话框内循环，不逃逸到背景内容
 * - 关闭时把焦点还给触发按钮
 *
 * 只覆盖当前两个“两个按钮”的确认对话框，不引入完整 Dialog 系统。
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocusTrap(getContainer: () => HTMLElement | null | undefined) {
  let previouslyFocused: HTMLElement | null = null

  function rememberTrigger() {
    previouslyFocused = document.activeElement as HTMLElement | null
  }

  function restoreTrigger() {
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') {
      return
    }

    const container = getContainer()

    if (!container) {
      return
    }

    const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]

    if (focusable.length === 0) {
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement
    const isInside = active instanceof HTMLElement && container.contains(active)

    if (event.shiftKey && (active === first || !isInside)) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && (active === last || !isInside)) {
      event.preventDefault()
      first.focus()
    }
  }

  return { handleKeydown, rememberTrigger, restoreTrigger }
}
