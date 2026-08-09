export { default as ClassGuidePage } from './ui/ClassGuidePage.vue'
export { default as ShowEmptyGuide } from './ui/ShowEmptyGuide.vue'
export { useGuidePreset } from './lib/useGuidePreset'
export { useGuideSpecMode, type GuideSpecMode } from './lib/useGuideSpecMode'
export { useHeaderClass, type HeaderClassInfo } from './lib/useHeaderClass'
export { useHeaderPresetFill } from './lib/useHeaderPresetFill'
export {
  computePresetFill,
  emptyPresetFill,
  type PresetFillMap,
} from './lib/presetHasContent'
export {
  displayAuthorLabel,
  formatSectionUpdated,
  parseSectionUpdates,
  sectionUpdateKey,
  uiSectionFromProposal,
  type GuideUiSection,
  type SectionUpdatesMap,
} from './lib/sectionUpdates'
