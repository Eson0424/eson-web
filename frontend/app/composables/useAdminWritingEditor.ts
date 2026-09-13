import { useAdminContentEditor } from './useAdminContentEditor'
import { fromWritingDetail, toWritingPayload } from '~/utils/writing-form'

/**
 * Admin Writing 编辑器：共享状态机见 useAdminContentEditor.ts。
 */
export function useAdminWritingEditor(id?: string) {
  return useAdminContentEditor({
    resource: useAdminWritingService(),
    id,
    form: reactive(createEmptyWritingForm()),
    fromDetail: fromWritingDetail,
    toPayload: toWritingPayload,
  })
}
