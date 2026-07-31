import type { ProposalSection } from '@/entities/class'

export type SubmitProposalInput = {
  class_slug: string
  section: ProposalSection
  payload: {
    text?: string
    skill_ids?: string[]
    buff_ids?: string[]
    mode?: string
    crystals?: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order?: number
    }>
    relics?: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order?: number
    }>
    lightstones?: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order?: number
    }>
  }
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
