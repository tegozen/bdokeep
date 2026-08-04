export type SubmitFeedbackInput = {
  body: string
  classSlug?: string
  website?: string
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  return $fetch<{ ok: boolean; id?: string }>('/api/feedback', {
    method: 'POST',
    body: {
      body: input.body,
      classSlug: input.classSlug || undefined,
      website: input.website || undefined,
    },
  })
}

/** @deprecated Use submitFeedback */
export const submitClassFeedback = submitFeedback
