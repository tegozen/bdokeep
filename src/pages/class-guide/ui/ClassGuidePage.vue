<template>
  <div :class="$style.page">
    <div v-if="error && !pending" :class="$style.error">
      Не удалось загрузить гайд. Проверьте API и обновите страницу.
    </div>

    <template v-if="pending">
      <div v-for="n in 5" :key="n" :class="$style.skel">
        <UiSkeleton variant="text" width="30%" height="1.4rem" />
        <UiSkeleton variant="block" height="120px" :class="$style.skelGap" />
      </div>
    </template>

    <template v-else-if="error">
      <!-- message above -->
    </template>

    <template v-else-if="!bundle">
      <ShowEmptyGuide
        title="Класс не найден"
        description="Такого класса нет или он скрыт."
      />
    </template>

    <template v-else>
      <GuideTopBlock
        :bundle="bundle"
        :guild-banner="guildBanner"
        :show-recruit-col="showRecruitCol"
        :is-staff="isStaff"
        :combo-kind="comboKind"
        :spec-mode="specMode"
        :section-subtitle="sectionSubtitle"
        :summary-section="summarySection"
        :combo-section="comboSection"
        :active-summary="activeSummary"
        :active-combos="activeCombos"
        :morph-filled="morphFilled"
        :drafts="topDrafts"
      />
      <GuideGearBlock
        :bundle="bundle"
        :fills="gearFills"
        :active-buffs="activeBuffs"
        :is-staff="isStaff"
        :section-subtitle="sectionSubtitle"
        :drafts="gearDrafts"
      />
      <GuideVideoBlock
        :bundle="bundle"
        :videos-section="videosSection"
        :active-videos="activeVideos"
        :section-subtitle="sectionSubtitle"
        :is-staff="isStaff"
        :drafts="videoDrafts"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { fetchLightstoneSets } from '@/entities/catalog'
import type { ClassGuideBundle } from '@/entities/class'
import {
  formatLightstoneSetLabel,
  matchLightstoneSet,
} from '@/shared/lib'
import { ShowEmptyGuide } from '@/shared/ui'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import { useClassPendingDrafts } from '../lib/useClassPendingDrafts'
import { useGuideActiveContent } from '../lib/useGuideActiveContent'
import { useGuideBoardFills } from '../lib/useGuideBoardFills'
import { useGuildRecruitBanner } from '../lib/useGuildRecruitBanner'
import { useHeaderPresetFillSync } from '../lib/useHeaderPresetFillSync'
import GuideGearBlock from './GuideGearBlock.vue'
import GuideTopBlock from './GuideTopBlock.vue'
import GuideVideoBlock from './GuideVideoBlock.vue'
import type {
  GuideGearDrafts,
  GuideTopDrafts,
  GuideVideoDrafts,
} from './guideDrafts'

const props = defineProps<{
  bundle: ClassGuideBundle | null
  pending: boolean
  error?: boolean
}>()

const { guildBanner, showRecruitCol } = await useGuildRecruitBanner()

const bundleRef = computed(() => props.bundle)
useHeaderPresetFillSync(bundleRef)

const {
  specMode,
  guidePreset,
  comboKind,
  sectionSubtitle,
  summarySection,
  comboSection,
  videosSection,
  activeMorphPreset,
  activeSummary,
  activeCombos,
  activeVideos,
  activeBuffs,
} = useGuideActiveContent(bundleRef)

const classSlug = computed(() => props.bundle?.class.slug)
const {
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
} = useClassPendingDrafts(classSlug, summarySection, videosSection)

// Session is resolved in plugins/superadmin-session.ts before this page runs.
// Await pending drafts on first paint so huge draft cards don't insert mid-scroll.
if (isStaff.value && props.bundle?.class.slug) {
  await loadClassPending()
}

const {
  crystalFilled,
  crystalPickedList,
  relicFilled,
  morphFilled,
  hardeningFilled,
} = useGuideBoardFills(bundleRef, guidePreset, activeMorphPreset)

const { data: lightstoneSets } = useAsyncData(
  'catalog-lightstone-sets',
  () => fetchLightstoneSets(),
  { lazy: true, default: () => [] },
)

const lightstoneSetLabel = computed(() =>
  formatLightstoneSetLabel(
    matchLightstoneSet(relicFilled.value, lightstoneSets.value ?? []),
  ),
)

const draftHandlers = {
  onChanged: onDraftChanged,
  onOptimisticRemove,
  onOptimisticRestore,
}

const topDrafts = computed(
  (): GuideTopDrafts => ({
    ...draftHandlers,
    visible: topDraftsVisible.value,
    summaryPending: summaryPending.value,
    summaryPendingCount: summaryPendingCount.value,
    comboPending: comboPending.value,
    comboPendingCount: comboPendingCount.value,
    morphPending: pendingFor('morphs'),
    morphPendingCount: sectionCount('morphs'),
  }),
)

const gearFills = computed(() => ({
  crystalFilled: crystalFilled.value,
  crystalPickedList: crystalPickedList.value,
  relicFilled: relicFilled.value,
  lightstoneSetLabel: lightstoneSetLabel.value,
  hardeningFilled: hardeningFilled.value,
}))

const gearDrafts = computed(
  (): GuideGearDrafts => ({
    ...draftHandlers,
    visible: gearDraftsVisible.value,
    crystalsPending: pendingFor('crystals'),
    relicsPending: pendingFor('relics'),
    hardeningPending: pendingFor('hardening'),
    buffsPending: pendingFor('buffs'),
  }),
)

const videoDrafts = computed(
  (): GuideVideoDrafts => ({
    ...draftHandlers,
    visible: videoDraftsVisible.value,
    videosPending: videosPending.value,
    videosPendingCount: videosPendingCount.value,
  }),
)
</script>

<style module>
.page {
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
}

.error {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  padding: 1rem 1.25rem;
  color: var(--color-danger);
}

.skel {
  margin-bottom: 1.5rem;
}

.skelGap {
  margin-top: 0.75rem;
}
</style>
