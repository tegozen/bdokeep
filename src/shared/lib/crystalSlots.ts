/** Crystal preset board — mirrors BDO transfusion UI (17 board + 6 dawn bar). */

export type CrystalSlotKind = 'standard' | 'center' | 'ornate' | 'dawn'

export type CrystalSlotDef = {
  id: string
  /** 1-based CSS grid row/col on the 5×5 board; null for dawn bar */
  row: number | null
  col: number | null
  kind: CrystalSlotKind
  label: string
}

/** Occupied cells of the 5×5 diamond (game-like layout). */
export const CRYSTAL_BOARD_SLOTS: CrystalSlotDef[] = [
  { id: 'nw', row: 1, col: 1, kind: 'ornate', label: 'СЗ' },
  { id: 'n', row: 1, col: 3, kind: 'standard', label: 'С' },
  { id: 'ne', row: 1, col: 5, kind: 'ornate', label: 'СВ' },

  { id: 'n_w', row: 2, col: 2, kind: 'standard', label: 'С-З' },
  { id: 'n_c', row: 2, col: 3, kind: 'standard', label: 'С-Ц' },
  { id: 'n_e', row: 2, col: 4, kind: 'standard', label: 'С-В' },

  { id: 'w', row: 3, col: 1, kind: 'standard', label: 'З' },
  { id: 'c_w', row: 3, col: 2, kind: 'standard', label: 'Ц-З' },
  { id: 'center', row: 3, col: 3, kind: 'center', label: 'Центр' },
  { id: 'c_e', row: 3, col: 4, kind: 'standard', label: 'Ц-В' },
  { id: 'e', row: 3, col: 5, kind: 'standard', label: 'В' },

  { id: 's_w', row: 4, col: 2, kind: 'standard', label: 'Ю-З' },
  { id: 's_c', row: 4, col: 3, kind: 'standard', label: 'Ю-Ц' },
  { id: 's_e', row: 4, col: 4, kind: 'standard', label: 'Ю-В' },

  { id: 'sw', row: 5, col: 1, kind: 'ornate', label: 'ЮЗ' },
  { id: 's', row: 5, col: 3, kind: 'standard', label: 'Ю' },
  { id: 'se', row: 5, col: 5, kind: 'ornate', label: 'ЮВ' },
]

export const CRYSTAL_DAWN_SLOTS: CrystalSlotDef[] = [
  { id: 'dawn_0', row: null, col: null, kind: 'dawn', label: 'Рассвет 1' },
  { id: 'dawn_1', row: null, col: null, kind: 'dawn', label: 'Рассвет 2' },
  { id: 'dawn_2', row: null, col: null, kind: 'dawn', label: 'Рассвет 3' },
  { id: 'dawn_3', row: null, col: null, kind: 'dawn', label: 'Рассвет 4' },
  { id: 'dawn_4', row: null, col: null, kind: 'dawn', label: 'Рассвет 5' },
  { id: 'dawn_5', row: null, col: null, kind: 'dawn', label: 'Рассвет 6' },
]

export const CRYSTAL_ALL_SLOTS: CrystalSlotDef[] = [...CRYSTAL_BOARD_SLOTS, ...CRYSTAL_DAWN_SLOTS]

export const CRYSTAL_SLOT_IDS = CRYSTAL_ALL_SLOTS.map((s) => s.id)
export const MAX_CRYSTALS = CRYSTAL_ALL_SLOTS.length

export function isCrystalSlotId(id: string): boolean {
  return CRYSTAL_SLOT_IDS.includes(id)
}

export function isDawnSlotId(id: string): boolean {
  return id.startsWith('dawn_')
}

export function isCenterSlotId(id: string): boolean {
  return id === 'center'
}

/** Dawn accessory crystals (bottom bar only) — not materials like «Рассветный кристалл». */
export function isDawnCrystalName(name: string): boolean {
  return /Кристалл рассвета|речного рассвета/i.test(name)
}

/** Outfit / Black Spirit claw center slot — only the two valid spirit stones. */
export function isSpiritCrystalName(name: string): boolean {
  return (
    name === 'Камень духов [Крит. удар]' || name === 'Камень духов [Скорость]'
  )
}

/** Catalog tabs for standard (non-dawn / non-center) slots. */
export type CrystalTabId =
  | 'basic'
  | 'ancient'
  | 'infinite'
  | 'dark'
  | 'upgraded'
  | 'special'

export const CRYSTAL_TABS: ReadonlyArray<{ id: CrystalTabId; label: string }> = [
  { id: 'basic', label: 'Обычные' },
  { id: 'ancient', label: 'Древние' },
  { id: 'infinite', label: 'Бесконеч.' },
  { id: 'dark', label: 'Тьма' },
  { id: 'upgraded', label: 'Улучш.' },
  { id: 'special', label: 'Особые' },
]

/** Map Garmoth `group` → catalog tab (fallback to name heuristics). */
const GARMOTH_GROUP_TAB: Record<string, CrystalTabId> = {
  kharazad: 'upgraded',
  'ultimate-gervish': 'upgraded',
  'ultimate-macalod': 'upgraded',
  'ultimate-hoom': 'upgraded',
  'dim-magic': 'basic',
  unlimited: 'special',
  'ancient-spirit': 'ancient',
  resist: 'ancient',
  'resist-ii': 'ancient',
  destruction: 'dark',
  bitterness: 'dark',
  decimation: 'dark',
  ahkrad: 'dark',
  'increased-extra-damage': 'special',
  'ignore-all-resist': 'special',
  spirit: 'special',
  primodial: 'special',
  aos: 'special',
  sovereign: 'special',
  edania: 'special',
}

export function crystalCatalogTab(
  name: string,
  group?: string | null,
): CrystalTabId {
  if (group && GARMOTH_GROUP_TAB[group]) return GARMOTH_GROUP_TAB[group]
  if (/^(Абсолют|Исток|Суть|Мощь|Предел):|речного рассвета/i.test(name)) return 'upgraded'
  if (/Древний магический/i.test(name)) return 'ancient'
  if (/бесконечности/i.test(name)) return 'infinite'
  if (/тьмы|Тьмы|Void|void|Ah'krad|Ах'?крад/i.test(name)) return 'dark'
  if (/^Магический кристалл/i.test(name)) return 'basic'
  return 'special'
}
