import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { ClassGuideBundle } from '@/entities/class'
import {
  computePresetFill,
  emptyPresetFill,
  useHeaderPresetFill,
} from '@/shared/lib'

/** Keep sticky-header preset dots in sync with the open class guide. */
export function useHeaderPresetFillSync(
  bundle: Ref<ClassGuideBundle | null | undefined>,
) {
  const headerPresetFill = useHeaderPresetFill()

  watch(
    bundle,
    (b) => {
      headerPresetFill.value = computePresetFill(b)
    },
    { immediate: true, deep: true },
  )

  onBeforeUnmount(() => {
    headerPresetFill.value = emptyPresetFill()
  })
}
