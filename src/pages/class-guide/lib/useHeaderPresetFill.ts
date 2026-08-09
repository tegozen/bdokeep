import type { PresetFillMap } from './presetHasContent'
import { emptyPresetFill } from './presetHasContent'

export function useHeaderPresetFill() {
  return useState<PresetFillMap>('headerPresetFill', () => emptyPresetFill())
}
