<template>
  <div :class="$style.wrap">
    <UiButton
      variant="secondary"
      size="sm"
      type="button"
      :disabled="!hasAnySource"
      :title="hasAnySource ? undefined : 'Нет других заполненных пресетов'"
      @click="openModal"
    >
      Скопировать из
    </UiButton>

    <UiModal
      :open="open"
      title="Скопировать из пресета"
      aria-label="Скопировать данные из другого пресета"
      :z-index="90"
      :obscured="obscured"
      :size="size"
      @close="close"
    >
      <div :class="$style.body">
        <p :class="$style.hint">
          Выберите пресет — его данные заменят «{{ targetLabel }}».
        </p>

        <UiPresetTabs
          v-model="sourcePreset"
          :tabs="sourceTabs"
          aria-label="Пресет-источник"
        />

        <div :class="$style.preview">
          <slot :preset="sourcePreset" />
        </div>

        <div :class="$style.actions">
          <UiButton variant="secondary" type="button" @click="close">Отмена</UiButton>
          <UiButton type="button" :disabled="!canCopy" @click="onCopy">
            Скопировать в {{ targetLabel }}
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  useConfirm,
  useModalEscape,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiButton, UiModal, UiPresetTabs, type UiModalSize } from '@/shared/ui'

const props = withDefaults(
  defineProps<{
    targetPreset: CrystalPresetId
    /** True when the currently edited preset already has data (overwrite confirm). */
    targetHasContent?: boolean
    /** True when a source preset has nothing to copy. */
    isEmpty?: (preset: CrystalPresetId) => boolean
    size?: UiModalSize
  }>(),
  {
    targetHasContent: false,
    isEmpty: () => false,
    size: 'lg',
  },
)

const emit = defineEmits<{
  copy: [source: CrystalPresetId]
}>()

const { confirm } = useConfirm()
const open = ref(false)
const sourcePreset = ref<CrystalPresetId>('t1')

const { obscured } = useModalEscape(open, () => {
  open.value = false
})

const targetLabel = computed(
  () => CRYSTAL_PRESETS.find((p) => p.id === props.targetPreset)?.label ?? props.targetPreset,
)

const sourceTabs = computed(() =>
  CRYSTAL_PRESETS.filter((p) => p.id !== props.targetPreset),
)

const hasAnySource = computed(() =>
  CRYSTAL_PRESET_IDS.some((id) => id !== props.targetPreset && !props.isEmpty(id)),
)

const canCopy = computed(() => !props.isEmpty(sourcePreset.value))

function pickDefaultSource(): CrystalPresetId {
  const others = CRYSTAL_PRESET_IDS.filter((id) => id !== props.targetPreset)
  const filled = others.find((id) => !props.isEmpty(id))
  return filled ?? others[0] ?? 't1'
}

function openModal() {
  if (!hasAnySource.value) return
  sourcePreset.value = pickDefaultSource()
  open.value = true
}

function close() {
  open.value = false
}

watch(
  () => props.targetPreset,
  () => {
    if (!open.value) return
    if (sourcePreset.value === props.targetPreset) {
      sourcePreset.value = pickDefaultSource()
    }
  },
)

async function onCopy() {
  if (!canCopy.value) return
  if (props.targetHasContent) {
    const sourceLabel =
      CRYSTAL_PRESETS.find((p) => p.id === sourcePreset.value)?.label ?? sourcePreset.value
    const ok = await confirm({
      title: 'Заменить пресет?',
      message: `Данные «${targetLabel.value}» будут заменены копией из «${sourceLabel}».`,
      confirmLabel: 'Скопировать',
      cancelLabel: 'Отмена',
    })
    if (!ok) return
  }
  emit('copy', sourcePreset.value)
  close()
}
</script>

<style module>
.wrap {
  display: inline-flex;
  flex-shrink: 0;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: 1rem;
}

.hint {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-muted);
}

/* Fixed pane; children own scroll so crystal list ≠ whole-pane scroll. */
.preview {
  flex: none;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 22rem;
  min-height: 22rem;
  max-height: 22rem;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 0.65rem;
}

.actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.85rem;
  margin-top: 0.15rem;
}
</style>
