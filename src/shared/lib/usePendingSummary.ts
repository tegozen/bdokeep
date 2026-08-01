import { fetchPendingSummary, type PendingSummary } from '@/features/superadmin-auth/api/pendingProposals'
import { useSuperadmin } from './useSuperadmin'

export function usePendingSummary() {
  const { isSuperadmin } = useSuperadmin()
  const summary = useState<PendingSummary>('pendingSummary', () => ({
    total: 0,
    byClass: {},
  }))
  const loading = useState('pendingSummaryLoading', () => false)

  async function refresh() {
    if (!isSuperadmin.value) {
      summary.value = { total: 0, byClass: {} }
      return
    }
    loading.value = true
    try {
      summary.value = await fetchPendingSummary()
    } catch {
      summary.value = { total: 0, byClass: {} }
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, refresh }
}
