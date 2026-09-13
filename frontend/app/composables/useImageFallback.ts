/**
 * 图片失败兜底的共享逻辑（Phase 4-F.6.2 从 PublicCover 提取，Cover 与 Gallery 共用）。
 *
 * 需要处理两种情况：
 * 1. 运行期失败：`@error`（error 事件不冒泡，必须由 AppImage 显式转发）
 * 2. SSR 预渲染的 <img> 在 hydration 之前就失败：error 事件早于监听器挂载而丢失，
 *    因此挂载后补一次 `complete && naturalWidth === 0` 状态检查。
 *
 * 约定：调用方的根元素模板 ref 必须命名为 `root`。
 */
export function useImageFallback(source: () => string | null | undefined) {
  const root = useTemplateRef<HTMLElement>('root')
  const failed = ref(false)

  // 地址变化（组件复用 / 切换条目）时重置，避免一次失败后永远不再尝试。
  watch(source, () => {
    failed.value = false
  })

  onMounted(() => {
    void nextTick(() => {
      const element = root.value?.querySelector('img')

      if (element?.complete && element.naturalWidth === 0) {
        failed.value = true
      }
    })
  })

  function markFailed() {
    failed.value = true
  }

  return { root, failed, markFailed }
}
