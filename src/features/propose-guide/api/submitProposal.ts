import type { ProposalSection } from '@domain'

export type SubmitProposalInput = {
  class_slug: string
  section: ProposalSection
  payload: {
    text?: string
    skill_ids?: string[]
    combos?: Array<{
      title?: string
      notes?: string
      skill_ids: string[]
    }>
    buff_ids?: string[]
    buffs?: Array<{
      preset: string
      buff_id: string
      sort_order?: number
    }>
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
    hardening?: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order?: number
    }>
    videos?: Array<{
      title?: string
      youtube_url: string
      sort_order?: number
    }>
    morphs?: Array<{
      preset: string
      slot_level: number
      skill_id: string
      effect_ids: [string, string]
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
