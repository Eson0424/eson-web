import { useAdminContentEditor } from './useAdminContentEditor'
import { fromWorkDetail, toWorkPayload } from '~/utils/work-form'

/**
 * Admin Work 编辑器：共享状态机见 useAdminContentEditor.ts。
 */
export function useAdminWorkEditor(id?: string) {
  return useAdminContentEditor({
    resource: useAdminWorkService(),
    id,
    form: reactive(createEmptyWorkForm()),
    fromDetail: fromWorkDetail,
    toPayload: toWorkPayload,
  })
}
