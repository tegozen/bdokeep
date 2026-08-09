import type { PendingProposal } from '@/features/superadmin-auth'

/** Shared staff-draft event handlers for class-guide section blocks. */
export type GuideDraftHandlers = {
  onChanged: (action: 'approve' | 'reject') => void | Promise<void>
  onOptimisticRemove: (item: PendingProposal) => void
  onOptimisticRestore: (item: PendingProposal) => void
}

export type GuideTopDrafts = GuideDraftHandlers & {
  visible: boolean
  summaryPending: PendingProposal[]
  summaryPendingCount: number
  comboPending: PendingProposal[]
  comboPendingCount: number
  morphPending: PendingProposal[]
  morphPendingCount: number
}

export type GuideGearDrafts = GuideDraftHandlers & {
  visible: boolean
  crystalsPending: PendingProposal[]
  relicsPending: PendingProposal[]
  hardeningPending: PendingProposal[]
  buffsPending: PendingProposal[]
}

export type GuideVideoDrafts = GuideDraftHandlers & {
  visible: boolean
  videosPending: PendingProposal[]
  videosPendingCount: number
}
