import { computed, ref, watch, type Ref } from 'vue'
import {
  fetchPendingForClass,
  usePendingSummary,
  useSuperadmin,
  type PendingProposal,
} from '@/features/superadmin-auth'

type SectionKey = string

/** Single pending-draft list + optimistic badge sync for the class page. */
export function useClassPendingDrafts(
  classSlug: Ref<string | undefined>,
  summarySection: Ref<string>,
  videosSection: Ref<string>,
) {
  const { isStaff } = useSuperadmin()
  const { refresh: refreshPendingSummary, adjust: adjustPendingSummary } =
    usePendingSummary()
  const classPending = ref<PendingProposal[]>([])
  const pendingRestoreAt = new Map<string, number>()

  async function loadClassPending() {
    if (!isStaff.value || !classSlug.value) {
      classPending.value = []
      return
    }
    try {
      classPending.value = await fetchPendingForClass(classSlug.value)
    } catch {
      classPending.value = []
    }
  }

  function onOptimisticRemove(item: PendingProposal) {
    const index = classPending.value.findIndex((p) => p.id === item.id)
    if (index >= 0) pendingRestoreAt.set(item.id, index)
    classPending.value = classPending.value.filter((p) => p.id !== item.id)
    adjustPendingSummary(-1, item.class_slug)
  }

  function onOptimisticRestore(item: PendingProposal) {
    if (classPending.value.some((p) => p.id === item.id)) return
    const index = pendingRestoreAt.get(item.id) ?? classPending.value.length
    pendingRestoreAt.delete(item.id)
    const next = [...classPending.value]
    next.splice(Math.min(index, next.length), 0, item)
    classPending.value = next
    adjustPendingSummary(1, item.class_slug)
  }

  function pendingFor(section: SectionKey) {
    return classPending.value.filter((p) => p.section === section)
  }

  function sectionCount(section: SectionKey) {
    return pendingFor(section).length
  }

  const comboPending = computed(() =>
    classPending.value.filter(
      (p) => p.section === 'combo_awakening' || p.section === 'combo_succession',
    ),
  )
  const comboPendingCount = computed(() => comboPending.value.length)

  const summaryPending = computed(() => pendingFor(summarySection.value))
  const summaryPendingCount = computed(() => summaryPending.value.length)
  const videosPending = computed(() => pendingFor(videosSection.value))
  const videosPendingCount = computed(() => videosPending.value.length)

  const gearDraftsVisible = computed(
    () =>
      sectionCount('crystals') > 0 ||
      sectionCount('relics') > 0 ||
      sectionCount('buffs') > 0 ||
      sectionCount('hardening') > 0,
  )

  const topDraftsVisible = computed(
    () =>
      summaryPendingCount.value > 0 ||
      comboPendingCount.value > 0 ||
      sectionCount('morphs') > 0,
  )

  const videoDraftsVisible = computed(() => videosPendingCount.value > 0)

  async function onDraftChanged(action: 'approve' | 'reject') {
    if (action === 'approve' && classSlug.value) {
      await refreshNuxtData(`class-${classSlug.value}`)
    }
    void refreshPendingSummary()
  }

  watch([isStaff, classSlug], () => {
    void loadClassPending()
  })

  return {
    isStaff,
    loadClassPending,
    onOptimisticRemove,
    onOptimisticRestore,
    onDraftChanged,
    pendingFor,
    sectionCount,
    comboPending,
    comboPendingCount,
    summaryPending,
    summaryPendingCount,
    videosPending,
    videosPendingCount,
    gearDraftsVisible,
    topDraftsVisible,
    videoDraftsVisible,
  }
}
