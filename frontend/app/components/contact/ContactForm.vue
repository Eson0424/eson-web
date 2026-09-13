<script setup lang="ts">
import type {
  ContactFieldConfig,
  ContactFieldErrors,
  ContactFieldId,
  ContactFormStatus,
  ContactFormValues,
} from '~/types/contact'
import {
  createEmptyContactForm,
  hasContactErrors,
  validateContactForm,
} from '~/utils/contact'
import { useContactService } from '~/services/contact.service'
import { ApiRequestError } from '~/services/api'

const { fields, submitLabel, integrationNote } = defineProps<{
  fields: ContactFieldConfig[]
  submitLabel: string
  integrationNote: string
}>()

const { t } = useI18n()
const formId = useId()

const contact = useContactService()

const values = reactive<ContactFormValues>(createEmptyContactForm())
const errors = ref<ContactFieldErrors>({})
const status = ref<ContactFormStatus>('idle')
const submitError = ref<string | null>(null)

const fieldId = (id: ContactFieldId) => `${formId}-${id}`
const errorId = (id: ContactFieldId) => `${formId}-${id}-error`
const isSubmitting = computed(() => status.value === 'submitting')

const inputClasses =
  'min-h-11 w-full rounded-sm border border-line bg-background-secondary px-3 py-2 text-ink placeholder:text-ink-muted focus-visible:border-line-strong'

// 文本域允许纵向调整，但不允许横向拉伸导致布局溢出。
const textareaClasses = cn(inputClasses, 'min-h-32 resize-y')

async function handleSubmit() {
  const validation = validateContactForm(values, fields)
  errors.value = validation

  if (hasContactErrors(validation)) {
    status.value = 'invalid'
    await nextTick()

    if (import.meta.client) {
      const firstInvalid = fields.find((field) => validation[field.id])

      if (firstInvalid) {
        document.getElementById(fieldId(firstInvalid.id))?.focus()
      }
    }

    return
  }

  status.value = 'submitting'
  submitError.value = null

  try {
    // 真实写入 contact_messages（POST /api/v1/contact）
    await contact.submit({
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      message: values.message,
    })

    status.value = 'success'
    Object.assign(values, createEmptyContactForm())
  } catch (error) {
    status.value = 'error'
    submitError.value = error instanceof ApiRequestError ? error.code : 'INTERNAL_ERROR'
  }
}
</script>

<template>
  <form
    :aria-busy="isSubmitting ? 'true' : undefined"
    class="flex flex-col gap-8"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <div
      v-for="field in fields"
      :key="field.id"
      class="flex flex-col gap-2"
    >
      <label :for="fieldId(field.id)" class="type-meta text-ink-secondary">
        {{ t(`contact.form.fields.${field.id}`) }}
        <span class="sr-only">
          {{ field.required ? t('contact.form.required') : t('contact.form.optional') }}
        </span>
        <span v-if="field.required" aria-hidden="true" class="text-accent-text">*</span>
      </label>

      <textarea
        v-if="field.type === 'textarea'"
        :id="fieldId(field.id)"
        v-model="values[field.id]"
        :aria-describedby="errors[field.id] ? errorId(field.id) : undefined"
        :aria-invalid="errors[field.id] ? 'true' : undefined"
        :autocomplete="field.autocomplete"
        :class="textareaClasses"
        :maxlength="field.maxLength"
        :name="field.id"
        :required="field.required"
        rows="6"
      />

      <input
        v-else
        :id="fieldId(field.id)"
        v-model="values[field.id]"
        :aria-describedby="errors[field.id] ? errorId(field.id) : undefined"
        :aria-invalid="errors[field.id] ? 'true' : undefined"
        :autocomplete="field.autocomplete"
        :class="inputClasses"
        :maxlength="field.maxLength"
        :name="field.id"
        :required="field.required"
        :type="field.type"
      >

      <p
        v-if="errors[field.id]"
        :id="errorId(field.id)"
        class="type-small text-status-busy"
      >
        <span aria-hidden="true" class="mr-2">!</span>
        {{ t(`contact.errors.${errors[field.id]}`) }}
      </p>
    </div>

    <div class="flex flex-col gap-6">
      <AppButton
        :disabled="isSubmitting"
        :loading="isSubmitting"
        class="w-fit"
        type="submit"
        variant="primary"
      >
        {{ submitLabel }}
      </AppButton>

      <ContactStatus :error-code="submitError" :integration-note="integrationNote" :status="status" />
    </div>
  </form>
</template>
