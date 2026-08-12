import { computed, type Ref } from 'vue'
import {
  classSummaryFieldFromGuide,
  comboKindFromPreset,
} from '@domain'
import { morphPresetFrom } from '@/entities/catalog'
import type { ClassGuideBundle } from '@/entities/class'
import {
  formatSectionUpdated,
  parseSectionUpdates,
  sectionUpdateMeta,
  type GuideUiSection,
} from './sectionUpdates'
import { useGuidePreset } from './useGuidePreset'
import { useGuideSpecMode } from './useGuideSpecMode'

/** Spec/preset-scoped guide content for the class page. */
export function useGuideActiveContent(bundle: Ref<ClassGuideBundle | null | undefined>) {
  const specMode = useGuideSpecMode()
  const guidePreset = useGuidePreset()
  const comboKind = computed(() => comboKindFromPreset(guidePreset.value))

  const sectionUpdates = computed(() =>
    parseSectionUpdates(bundle.value?.guide?.section_updates),
  )

  function sectionSubtitle(key: GuideUiSection) {
    const meta = sectionUpdateMeta(sectionUpdates.value, key, specMode.value, comboKind.value)
    return formatSectionUpdated(meta)
  }

  const summarySection = computed(() =>
    specMode.value === 'succession'
      ? ('summary_succession' as const)
      : ('summary_awakening' as const),
  )
  const comboSection = computed(() =>
    specMode.value === 'succession'
      ? ('combo_succession' as const)
      : ('combo_awakening' as const),
  )
  const videosSection = computed(() =>
    specMode.value === 'succession'
      ? ('videos_succession' as const)
      : ('videos_awakening' as const),
  )

  const activeMorphPreset = computed(() =>
    morphPresetFrom(specMode.value, guidePreset.value),
  )

  const activeSummary = computed(() => {
    const guide = bundle.value?.guide
    if (!guide) return null
    const field = classSummaryFieldFromGuide(guidePreset.value, specMode.value)
    const text = guide[field]
    return text?.trim() ? text : null
  })

  const activeCombos = computed(() => {
    const mode = specMode.value
    const kind = comboKind.value
    return (
      bundle.value?.combos
        .filter((c) => c.mode === mode && (c.kind || 'pvp') === kind)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order) ?? []
    )
  })

  const activeVideos = computed(
    () =>
      bundle.value?.videos.filter(
        (v) => (v.mode || 'awakening') === specMode.value,
      ) ?? [],
  )

  const activeBuffs = computed(() =>
    (bundle.value?.buffs ?? []).filter(
      (row) => (row.preset || 't1') === guidePreset.value,
    ),
  )

  return {
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
  }
}
