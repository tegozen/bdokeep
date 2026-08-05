import { $fetch } from '../../../mf-shared/nuxtAutoImports'

export type SubmitFeedbackInput = {
  body: string
  classSlug?: string
  website?: string
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  return $fetch('/api/feedback', {
    method: 'POST',
    body: {
      body: input.body,
      classSlug: input.classSlug || undefined,
      website: input.website || undefined,
    },
  }) as Promise<{ ok: boolean; id?: string }>
}

/** @deprecated Use submitFeedback */
export const submitClassFeedback = submitFeedback
