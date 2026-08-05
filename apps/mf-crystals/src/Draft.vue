<script setup lang="ts">
import { computed } from 'vue'
import ProposeCrystalForm from './ui/ProposeCrystalForm.vue'
import CrystalBoard from './ui/CrystalBoard.vue'
import type { CrystalFill } from './ui/CrystalBoard.vue'
import { CRYSTAL_SLOT_IDS } from './lib/slots'
import type { CrystalPresetId } from './lib/presets'

const props = defineProps<{
  classSlug?: string
  readOnly?: boolean
  payload?: {
    crystals?: Array<{
      preset?: string
      slot?: string
      item?: { id: string; name: string; icon_url: string | null }
      item_id?: string
    }>
  }
  previewPreset?: CrystalPresetId
  hydratedFills?: Record<string, CrystalFill>
}>()

const previewFilled = computed(() => {
  if (props.hydratedFills) return props.hydratedFills
  const filled: Record<string, CrystalFill> = {}
  const preset = props.previewPreset ?? 't1'
  for (const row of props.payload?.crystals ?? []) {
    if ((row.preset ?? 't1') !== preset) continue
    const slot = row.slot
    if (!slot || !CRYSTAL_SLOT_IDS.includes(slot)) continue
    const item = row.item
    if (!item?.id) continue
    filled[slot] = {
      id: item.id,
      name_ru: item.name ?? '',
      icon_url: item.icon_url ?? null,
    }
  }
  return filled
})
</script>

<template>
  <CrystalBoard v-if="readOnly" :filled="previewFilled" />
  <ProposeCrystalForm v-else-if="classSlug" :class-slug="classSlug" />
</template>
