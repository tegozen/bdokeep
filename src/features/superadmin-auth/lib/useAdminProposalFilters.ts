import { PROPOSAL_SECTIONS, sectionLabel, type ProposalSection } from '@domain'

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

export const ADMIN_PROPOSAL_SECTION_OPTIONS: ReadonlyArray<{
  id: ProposalSection
  label: string
}> = PROPOSAL_SECTIONS.map((id) => ({
  id,
  label: sectionLabel(id),
}))

function parseStatus(raw: unknown): AdminProposalStatus {
  if (raw === 'approved' || raw === 'rejected' || raw === 'all' || raw === 'pending') {
    return raw
  }
  return 'pending'
}

function parseSection(raw: unknown): ProposalSection | '' {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return (PROPOSAL_SECTIONS as readonly string[]).includes(value)
    ? (value as ProposalSection)
    : ''
}

function parseClass(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

/** Route-synced status / class / section filter for `/admin/proposals` subheader + page. */
export function useAdminProposalFilters() {
  const route = useRoute()
  const router = useRouter()

  function replaceQuery(next: {
    status: AdminProposalStatus
    classFilter: string
    sectionFilter: ProposalSection | ''
  }) {
    const query: Record<string, string> = { status: next.status }
    const cls = next.classFilter.trim().toLowerCase()
    if (cls) query.class = cls
    if (next.sectionFilter) query.section = next.sectionFilter
    void router.replace({ query })
  }

  const status = computed({
    get: () => parseStatus(route.query.status),
    set: (value: AdminProposalStatus) => {
      replaceQuery({
        status: value,
        classFilter: parseClass(route.query.class),
        sectionFilter: parseSection(route.query.section),
      })
    },
  })

  const classFilter = computed({
    get: () => parseClass(route.query.class),
    set: (value: string) => {
      replaceQuery({
        status: parseStatus(route.query.status),
        classFilter: value,
        sectionFilter: parseSection(route.query.section),
      })
    },
  })

  const sectionFilter = computed({
    get: () => parseSection(route.query.section),
    set: (value: ProposalSection | '') => {
      replaceQuery({
        status: parseStatus(route.query.status),
        classFilter: parseClass(route.query.class),
        sectionFilter: value,
      })
    },
  })

  function clearClassFilter() {
    classFilter.value = ''
  }

  function clearSectionFilter() {
    sectionFilter.value = ''
  }

  return {
    status,
    classFilter,
    sectionFilter,
    clearClassFilter,
    clearSectionFilter,
    statusTabs: ADMIN_PROPOSAL_STATUS_TABS,
    sectionOptions: ADMIN_PROPOSAL_SECTION_OPTIONS,
  }
}
