import { useAdminContentEditor } from './useAdminContentEditor'
import {
  experienceFormErrorKey,
  experienceTranslationSummary,
  fromExperienceDetail,
  hasExperienceFormErrors,
  toExperiencePayload,
  validateExperienceForm,
} from '~/utils/experience-form'

/**
 * Admin Experience 编辑器：共享状态机见 useAdminContentEditor.ts，
 * 校验 / 翻译完成度 / payload 使用 Experience 自己的规则。
 */
export function useAdminExperienceEditor(id?: string) {
  return useAdminContentEditor({
    resource: useAdminExperienceService(),
    id,
    form: reactive(createEmptyExperienceForm()),
    fromDetail: fromExperienceDetail,
    toPayload: toExperiencePayload,
    validate: (form) => {
      const errors = validateExperienceForm(form)

      return hasExperienceFormErrors(errors)
        ? { valid: false, errorKey: experienceFormErrorKey(errors) }
        : { valid: true }
    },
    translationStatus: experienceTranslationSummary,
  })
}
