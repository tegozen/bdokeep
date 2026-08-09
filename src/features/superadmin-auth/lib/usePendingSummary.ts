import { fetchPendingSummary, type PendingSummary } from '../api/pendingProposals'
import { useSuperadmin } from './useSuperadmin'

export function usePendingSummary() {
  const { isStaff } = useSuperadmin()
  const summary = useState<PendingSummary>('pendingSummary', () => ({
    total: 0,
    byClass: {},
  }))
  const loading = useState('pendingSummaryLoading', () => false)

  async function refresh() {
    if (!isStaff.value) {
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

  /** Optimistic badge tweak; pass classSlug when the change is per-class. */
  function adjust(delta: number, classSlug?: string) {
    const nextTotal = Math.max(0, summary.value.total + delta)
    const byClass = { ...summary.value.byClass }
    if (classSlug) {
      const n = Math.max(0, (byClass[classSlug] ?? 0) + delta)
      if (n === 0) delete byClass[classSlug]
      else byClass[classSlug] = n
    }
    summary.value = { total: nextTotal, byClass }
  }

  return { summary, loading, refresh, adjust }
}
