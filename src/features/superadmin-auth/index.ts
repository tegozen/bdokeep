export { default as SuperadminAuth } from './ui/SuperadminAuth.vue'
export { default as PendingSectionDrafts } from './ui/PendingSectionDrafts.vue'
export { default as ProposalSectionPreview } from './ui/ProposalSectionPreview.vue'
export { default as ReviewSummaryModal } from './ui/ReviewSummaryModal.vue'
export {
  approveProposal,
  fetchPendingForClass,
  fetchPendingSummary,
  rejectProposal,
  type PendingProposal,
  type PendingSummary,
} from './api/pendingProposals'
