import { toApiError } from './api'

export interface ContactSubmission {
  name: string
  email: string
  subject: string
  message: string
}

export interface ContactReceipt {
  id: string
  status: string
  createdAt: string
}

export function useContactService() {
  const config = useRuntimeConfig()

  /** POST /api/v1/contact（docs/API.md §17）：真实写入 contact_messages */
  async function submit(payload: ContactSubmission): Promise<ContactReceipt> {
    try {
      const response = await $fetch<{ success: true; data: ContactReceipt }>('/contact', {
        baseURL: config.public.apiBase,
        method: 'POST',
        body: payload,
        timeout: 10_000,
      })

      return response.data
    } catch (error) {
      throw toApiError(error)
    }
  }

  return { submit }
}
