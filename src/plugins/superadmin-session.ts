/**
 * Resolve admin cookie before pages render so class-guide pending drafts
 * (large min-height blocks) don't pop in mid-scroll after onMounted refresh.
 */
import { useSuperadmin } from '@/features/superadmin-auth'

export default defineNuxtPlugin(async () => {
  const { refresh } = useSuperadmin()
  await refresh()
})
