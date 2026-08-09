export {
  CODEX_ICON_CACHE_V,
  codexIconDbPath,
  codexIconSrc,
  isLocalAppImageUrl,
  rewriteIconUrlsDeep,
  rewriteRemoteIconToLocal,
  withCodexIconCacheBust,
} from './codexIcon'
export {
  sanitizeYoutubeUrl,
  youtubeEmbedUrl,
  youtubeVideoId,
  youtubeThumbProxyUrl,
  isPlaceholderVideoTitle,
  YOUTUBE_IFRAME_ALLOW,
} from './youtube'
export { useHeaderClass, type HeaderClassInfo } from './useHeaderClass'
export { useHeaderPresetFill } from './useHeaderPresetFill'
export {
  useHomeClassFilters,
  HOME_TIER_OPTIONS,
  type HomeTierMin,
} from './useHomeClassFilters'
export {
  useAdminProposalFilters,
  ADMIN_PROPOSAL_STATUS_TABS,
  type AdminProposalStatus,
} from './useAdminProposalFilters'
export {
  displayAuthorLabel,
  formatRuDate,
  formatSectionUpdated,
  parseSectionUpdates,
  sectionUpdateKey,
  uiSectionFromProposal,
  type GuideUiSection,
  type SectionUpdateMeta,
  type SectionUpdatesMap,
} from './sectionUpdates'
export { useGuideSpecMode, type GuideSpecMode } from './useGuideSpecMode'
export { useGuidePreset } from './useGuidePreset'
export {
  computePresetFill,
  emptyPresetFill,
  type PresetFillMap,
} from './presetHasContent'
export { useSuperadmin } from './useSuperadmin'
export { usePendingSummary } from './usePendingSummary'
export { useConfirm, type ConfirmOptions, type AlertOptions } from './useConfirm'
export { useModalEscape } from './useModalEscape'
export { useUnsavedGuard } from './useUnsavedGuard'
export { useOnlineStatus, type UseOnlineStatus } from './useOnlineStatus'
export { clearAdminOfflineCaches, ADMIN_OFFLINE_CACHE_NAMES } from './clearAdminOfflineCaches'
export { listCachedGuideSlugs } from './listCachedGuideSlugs'
export {
  absoluteUrl,
  hasSiteUrl,
  normalizeSiteUrl,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE_PATH,
  SITE_TITLE,
} from './siteUrl'
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
  formatLightstoneSetLabel,
  matchLightstoneSet,
  type MatchedLightstoneSet,
} from './matchLightstoneSet'
export {
  HARDENING_SLOT_IDS,
  HARDENING_SLOTS,
  MAX_HARDENING,
  MAX_HARDENING_ALL_PRESETS,
  isHardeningSlotId,
  type HardeningSlotDef,
  type HardeningSlotId,
} from './hardeningSlots'
export {
  MAX_MORPHS_ALL_PRESETS,
  MORPH_PRESETS,
  MORPH_PRESET_IDS,
  MORPH_SLOT_LEVELS,
  emptyMorphPresetBoards,
  isMorphPresetId,
  isMorphSlotLevel,
  morphEffectSlotId,
  morphGuidePreset,
  morphPresetFrom,
  morphPresetSkillMode,
  morphSkillSlotId,
  parseMorphBoardSlot,
  resolveAddonLabel,
  type MorphEffectIndex,
  type MorphPresetId,
  type MorphSlotLevel,
} from './morphPresets'
