import type { ProposalSection } from '@/entities/class'

export type TextProposalInput = {
  class_slug: string
  section: ProposalSection
  payload: { text?: string; skill_ids?: string[]; mode?: string }
  author_label?: string
  website?: string
}

export type SubmitProposalResult = {
  ok: boolean
  id?: string
  autoApproved?: boolean
}

export async function submitGuideProposal(input: SubmitProposalInput) {
  return $fetch<SubmitProposalResult>('/api/proposals', {
    method: 'POST',
    body: input,
  })
}
