export { default as SuperadminAuth } from './ui/SuperadminAuth.vue'
export { default as PendingSectionDrafts } from './ui/PendingSectionDrafts.vue'
export {
  approveProposal,
  fetchPendingForClass,
  fetchPendingSummary,
  rejectProposal,
  type PendingProposal,
  type PendingSummary,
} from './api/pendingProposals'
