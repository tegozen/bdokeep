export type PendingProposal = {
  id: string
  class_id: string
  class_slug: string
  section: string
  payload: Record<string, unknown> | null
  author_label: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  review_note: string | null
}

export type PendingSummary = {
  total: number
  byClass: Record<string, number>
}

export async function fetchPendingSummary(): Promise<PendingSummary> {
  const requestFetch = useRequestFetch()
  return requestFetch<PendingSummary>('/api/admin/proposals', {
    query: { summary: '1' },
  })
}

export async function fetchPendingForClass(classSlug: string): Promise<PendingProposal[]> {
  const requestFetch = useRequestFetch()
  const res = await requestFetch<{ items: PendingProposal[] }>('/api/admin/proposals', {
    query: { status: 'pending', class_slug: classSlug },
  })
  return res.items ?? []
}

export async function approveProposal(
  id: string,
  opts?: { payload?: { text: string } },
): Promise<void> {
  await $fetch(`/api/admin/proposals/${id}/approve`, {
    method: 'POST',
    body: opts?.payload ? { payload: opts.payload } : undefined,
  })
}

export async function rejectProposal(id: string): Promise<void> {
  await $fetch(`/api/admin/proposals/${id}/reject`, { method: 'POST', body: {} })
}
