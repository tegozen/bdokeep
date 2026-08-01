export { sanitizeYoutubeUrl, youtubeEmbedUrl } from './youtube'
export { useHeaderClass, type HeaderClassInfo } from './useHeaderClass'
export { useHeaderToc, CLASS_GUIDE_TOC, type HeaderTocItem } from './useHeaderToc'
export { useGuideSpecMode, type GuideSpecMode } from './useGuideSpecMode'
export { useSuperadmin } from './useSuperadmin'
export { usePendingSummary } from './usePendingSummary'
export { useConfirm, type ConfirmOptions } from './useConfirm'
export { useModalEscape } from './useModalEscape'
export {
  CRYSTAL_ALL_SLOTS,
  CRYSTAL_BOARD_SLOTS,
  CRYSTAL_DAWN_SLOTS,
  CRYSTAL_SLOT_IDS,
  CRYSTAL_TABS,
  MAX_CRYSTALS,
  crystalCatalogTab,
  isCenterSlotId,
  isCrystalSlotId,
  isDawnCrystalName,
  isDawnSlotId,
  isSpiritCrystalName,
  type CrystalSlotDef,
  type CrystalSlotKind,
  type CrystalTabId,
} from './crystalSlots'
export {
  CRYSTAL_PRESETS,
  CRYSTAL_PRESET_IDS,
  MAX_CRYSTALS_ALL_PRESETS,
  isCrystalPresetId,
  type CrystalPresetId,
} from './crystalPresets'
/** Shared guide presets (crystals + relics). */
export {
  CRYSTAL_PRESETS as GUIDE_PRESETS,
  CRYSTAL_PRESET_IDS as GUIDE_PRESET_IDS,
  isCrystalPresetId as isGuidePresetId,
  type CrystalPresetId as GuidePresetId,
} from './crystalPresets'
export {
  LIGHTSTONE_SLOT_IDS,
  RELIC_BOARD_PANELS,
  RELIC_SLOT_IDS,
  isLightstoneSlotId,
  isRelicSlotId,
  lightstoneSlotsForRelic,
  relicSlotForLightstone,
  type LightstoneSlotId,
  type RelicBoardSlotDef,
  type RelicBoardSlotKind,
  type RelicSlotId,
} from './relicSlots'
export {
  MAX_MORPHS_ALL_PRESETS,
  MORPH_CUT_KINDS,
  MORPH_PRESETS,
  MORPH_PRESET_IDS,
  MORPH_SLOT_LEVELS,
  isMorphCutKind,
  isMorphPresetId,
  isMorphSlotLevel,
  morphCutKind,
  morphPresetFrom,
  morphPresetSkillMode,
  resolveAddonLabel,
  type MorphCutKind,
  type MorphPresetId,
  type MorphSlotLevel,
} from './morphPresets'
