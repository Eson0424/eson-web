import { useAdminContentEditor } from './useAdminContentEditor'
import { fromLabDetail, toLabPayload } from '~/utils/lab-form'

/**
 * Admin Lab 编辑器：共享状态机见 useAdminContentEditor.ts。
 */
export function useAdminLabEditor(id?: string) {
  return useAdminContentEditor({
    resource: useAdminLabService(),
    id,
    form: reactive(createEmptyLabForm()),
    fromDetail: fromLabDetail,
    toPayload: toLabPayload,
  })
}
