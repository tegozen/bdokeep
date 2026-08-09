export type AdminProposalStatus = 'pending' | 'approved' | 'rejected' | 'all'

export const ADMIN_PROPOSAL_STATUS_TABS: ReadonlyArray<{
  id: AdminProposalStatus
  label: string
}> = [
  { id: 'pending', label: 'Ожидает' },
  { id: 'approved', label: 'Одобрено' },
  { id: 'rejected', label: 'Отклонено' },
  { id: 'all', label: 'Все' },
]

function parseStatus(raw: unknown): AdminProposalStatus {
  if (raw === 'approved' || raw === 'rejected' || raw === 'all' || raw === 'pending') {
    return raw
  }
  return 'pending'
}

/** Route-synced status / class filter for `/admin/proposals` subheader + page. */
export function useAdminProposalFilters() {
  const route = useRoute()
  const router = useRouter()

  const status = computed({
    get: () => parseStatus(route.query.status),
    set: (value: AdminProposalStatus) => {
      const query: Record<string, string> = { ...route.query } as Record<string, string>
      query.status = value
      const cls =
        typeof route.query.class === 'string' ? route.query.class.trim().toLowerCase() : ''
      if (cls) query.class = cls
      else delete query.class
      void router.replace({ query })
    },
  })

  const classFilter = computed({
    get: () =>
      typeof route.query.class === 'string' ? route.query.class.trim().toLowerCase() : '',
    set: (value: string) => {
      const query: Record<string, string> = { ...route.query } as Record<string, string>
      query.status = parseStatus(route.query.status)
      const cls = value.trim().toLowerCase()
      if (cls) query.class = cls
      else delete query.class
      void router.replace({ query })
    },
  })

  function clearClassFilter() {
    classFilter.value = ''
  }

  return {
    status,
    classFilter,
    clearClassFilter,
    statusTabs: ADMIN_PROPOSAL_STATUS_TABS,
  }
}
