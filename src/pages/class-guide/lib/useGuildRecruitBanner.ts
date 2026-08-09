import { computed } from 'vue'
import type { GuildBannerPublic } from '@/widgets/guild-banner'

export async function useGuildRecruitBanner() {
  const { data: guildBanner } = await useAsyncData(
    'guild-banner',
    () => $fetch<GuildBannerPublic>('/api/guild-banner'),
    {
      default: () => ({ enabled: false }) as GuildBannerPublic,
    },
  )

  const showRecruitCol = computed(() => {
    const d = guildBanner.value
    if (!d || d.enabled !== true) return false
    return (
      Boolean(d.body) ||
      d.has_icon ||
      (Array.isArray(d.links) && d.links.length > 0)
    )
  })

  return { guildBanner, showRecruitCol }
}
