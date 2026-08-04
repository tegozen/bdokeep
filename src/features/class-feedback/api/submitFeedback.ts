export type SubmitFeedbackInput = {
  classSlug: string
  body: string
  website?: string
}

export async function submitClassFeedback(input: SubmitFeedbackInput) {
  return $fetch<{ ok: boolean; id?: string }>(
    `/api/classes/${encodeURIComponent(input.classSlug)}/feedback`,
    {
      method: 'POST',
      body: {
        body: input.body,
        website: input.website || undefined,
      },
    },
  )
}
