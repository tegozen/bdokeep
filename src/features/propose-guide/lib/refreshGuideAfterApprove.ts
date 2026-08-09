import { usePendingSummary } from '@/features/superadmin-auth'

/** Refresh published guide data after an auto-approved proposal (no full app reload). */
export async function refreshGuideAfterApprove(classSlug: string) {
  if (!classSlug) return
  await refreshNuxtData(`class-${classSlug}`)
  const { refresh } = usePendingSummary()
  await refresh()
}
