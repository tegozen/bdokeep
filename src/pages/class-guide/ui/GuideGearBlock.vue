<template>
  <div :class="$style.gearBlock">
    <div :class="[$style.gearCell, $style.gearLive]">
      <GuideSection
        flush
        title="Инкрустация"
        :subtitle="sectionSubtitle('crystals')"
      >
        <template v-if="drafts.crystalsPending.length" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{
            drafts.crystalsPending.length
          }}</span>
        </template>
        <template #actions>
          <ProposeLazy
            :loader="() => import('@/features/propose-guide/ui/ProposeCrystalForm.vue')"
            :form-props="{
              classSlug: bundle.class.slug,
              initialCrystals: bundle.crystals,
            }"
          />
        </template>
        <div :class="[$style.crystalLayout, $style.fade]">
          <div :class="$style.picked">
            <p v-if="!fills.crystalPickedList.length" :class="$style.pickedEmpty">
              Пока пусто
            </p>
            <ul v-else :class="$style.pickedList">
              <li
                v-for="row in fills.crystalPickedList"
                :key="row.id"
                :class="$style.pickedItem"
              >
                <img
                  v-if="row.icon_url"
                  :src="codexIconSrc(row.icon_url) || undefined"
                  alt=""
                  :class="$style.pickedIcon"
                  loading="lazy"
                />
                <span :class="$style.pickedName">{{ row.name_ru }}</span>
                <span v-if="row.count > 1" :class="$style.pickedCount"
                  >×{{ row.count }}</span
                >
              </li>
            </ul>
          </div>
          <div :class="$style.crystalStage">
            <CrystalBoard :filled="fills.crystalFilled" />
          </div>
        </div>
      </GuideSection>
    </div>

    <div :class="[$style.gearCell, $style.gearLive]">
      <GuideSection
        flush
        title="Реликвии"
        :subtitle="sectionSubtitle('relics')"
      >
        <template v-if="drafts.relicsPending.length" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{
            drafts.relicsPending.length
          }}</span>
        </template>
        <template #actions>
          <ProposeLazy
            :loader="() => import('@/features/propose-guide/ui/ProposeRelicForm.vue')"
            :form-props="{
              classSlug: bundle.class.slug,
              initialRelics: bundle.relics,
              initialLightstones: bundle.lightstones,
            }"
          />
        </template>
        <div :class="[$style.relicStage, $style.fade]">
          <RelicBoard
            :filled="fills.relicFilled"
            :lightstone-set-name="fills.lightstoneSetLabel"
          />
        </div>
      </GuideSection>
    </div>

    <div :class="[$style.gearCell, $style.gearLive]">
      <GuideSection
        flush
        title="Закалки"
        :subtitle="sectionSubtitle('hardening')"
      >
        <template v-if="drafts.hardeningPending.length" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{
            drafts.hardeningPending.length
          }}</span>
        </template>
        <template #actions>
          <ProposeLazy
            :loader="() => import('@/features/propose-guide/ui/ProposeHardeningForm.vue')"
            :form-props="{
              classSlug: bundle.class.slug,
              initialHardening: bundle.hardening,
            }"
          />
        </template>
        <div :class="[$style.hardeningStage, $style.fade]">
          <HardeningBoard list-only :filled="fills.hardeningFilled" />
        </div>
      </GuideSection>
    </div>

    <div :class="[$style.gearCell, $style.gearLive, $style.buffCol]">
      <GuideSection
        fill
        flush
        title="Забаф"
        :subtitle="sectionSubtitle('buffs')"
      >
        <template v-if="drafts.buffsPending.length" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{
            drafts.buffsPending.length
          }}</span>
        </template>
        <template #actions>
          <ProposeLazy
            :loader="() => import('@/features/propose-guide/ui/ProposeBuffsForm.vue')"
            :form-props="{
              classSlug: bundle.class.slug,
              initialBuffs: bundle.buffs,
            }"
          />
        </template>
        <div :class="$style.scrollCard">
          <ul
            v-if="activeBuffs.length"
            :class="[$style.buffList, $style.fade]"
          >
            <li
              v-for="row in activeBuffs"
              :key="row.id"
              :class="$style.buffItem"
            >
              <img
                v-if="row.buffs?.icon_url"
                :src="codexIconSrc(row.buffs.icon_url) || undefined"
                alt=""
                :class="$style.buffIcon"
                loading="lazy"
              />
              <div :class="$style.buffBody">
                <strong>{{
                  row.buffs?.name_ru || row.slot || 'Слот'
                }}</strong>
                <span v-if="row.group_name" :class="$style.muted">
                  · {{ row.group_name }}</span
                >
                <p v-if="row.notes" :class="$style.notes">
                  {{ row.notes }}
                </p>
              </div>
            </li>
          </ul>
          <p v-else :class="[$style.buffEmpty, $style.fade]">Пока пусто</p>
        </div>
      </GuideSection>
    </div>

    <template v-if="isStaff && drafts.visible">
      <div :class="[$style.gearCell, $style.gearDraft]">
        <PendingSectionDrafts
          v-if="drafts.crystalsPending.length"
          :proposals="drafts.crystalsPending"
          @changed="drafts.onChanged"
          @optimistic-remove="drafts.onOptimisticRemove"
          @optimistic-restore="drafts.onOptimisticRestore"
        />
      </div>
      <div :class="[$style.gearCell, $style.gearDraft]">
        <PendingSectionDrafts
          v-if="drafts.relicsPending.length"
          :proposals="drafts.relicsPending"
          @changed="drafts.onChanged"
          @optimistic-remove="drafts.onOptimisticRemove"
          @optimistic-restore="drafts.onOptimisticRestore"
        />
      </div>
      <div :class="[$style.gearCell, $style.gearDraft]">
        <PendingSectionDrafts
          v-if="drafts.hardeningPending.length"
          :proposals="drafts.hardeningPending"
          @changed="drafts.onChanged"
          @optimistic-remove="drafts.onOptimisticRemove"
          @optimistic-restore="drafts.onOptimisticRestore"
        />
      </div>
      <div :class="[$style.gearCell, $style.gearDraft]">
        <PendingSectionDrafts
          v-if="drafts.buffsPending.length"
          :proposals="drafts.buffsPending"
          @changed="drafts.onChanged"
          @optimistic-remove="drafts.onOptimisticRemove"
          @optimistic-restore="drafts.onOptimisticRestore"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ClassGuideBundle, GuideBuffRow } from '@/entities/class'
import { ProposeLazy } from '@/features/propose-guide'
import { PendingSectionDrafts } from '@/features/superadmin-auth'
import {
  CrystalBoard,
  HardeningBoard,
  RelicBoard,
  type CrystalFill,
  type HardeningFill,
  type RelicFill,
} from '@/entities/catalog'
import { codexIconSrc } from '@/shared/lib'
import type { GuideUiSection } from '../lib/sectionUpdates'
import { GuideSection } from '@/widgets/guide-section'
import type { GuideGearDrafts } from './guideDrafts'

export type GuideGearFills = {
  crystalFilled: Record<string, CrystalFill>
  crystalPickedList: Array<{
    id: string
    name_ru: string
    icon_url: string | null
    count: number
  }>
  relicFilled: Record<string, RelicFill>
  lightstoneSetLabel: string | null | undefined
  hardeningFilled: Record<string, HardeningFill>
}

defineProps<{
  bundle: ClassGuideBundle
  fills: GuideGearFills
  activeBuffs: GuideBuffRow[]
  isStaff: boolean
  sectionSubtitle: (key: GuideUiSection) => string
  drafts: GuideGearDrafts
}>()
</script>

<style module>
.fade {
  animation: fade-in 320ms ease;
}

.pendingBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
  border-radius: 999px;
  background: var(--color-gold-dim);
  color: var(--color-gold);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.2rem 0.4rem;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

.buffList {
  margin: 0;
  display: grid;
  list-style: none;
  gap: 0.5rem;
  padding: 0;
}

.buffItem {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.55rem 0.65rem;
}

.buffIcon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.buffBody {
  min-width: 0;
  font-size: 0.88rem;
  line-height: 1.3;
}

.buffEmpty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.muted {
  font-weight: 400;
  color: var(--color-muted);
}

.notes {
  margin: 0.375rem 0 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}

.gearBlock {
  display: grid;
  /* crystals | relics | hardening (fit 5 slots) | buffs (rest) */
  grid-template-columns: auto auto auto minmax(14rem, 1fr);
  gap: 1px;
  /* Gap lines = border color; cells cover with page bg so empties stay dark. */
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.gearCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.gearDraft {
  display: flex;
  flex-direction: column;
  /* Crystal board ≈ square + dawn row + draft chrome; 32rem clipped the dawn strip. */
  height: min(40rem, 82vh);
  min-height: min(40rem, 82vh);
  overflow: visible;
  padding: 0;
}

.gearDraft > * {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.buffCol {
  /* Size row from crystals/relics/hardening; scroll buffs inside that height. */
  display: flex;
  flex-direction: column;
  height: 0;
  min-height: 100%;
  overflow: hidden;
}

.scrollCard {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.55rem;
}

.crystalLayout {
  display: grid;
  grid-template-columns: minmax(11rem, 14rem) minmax(0, 22rem);
  gap: 0.85rem;
  align-items: stretch;
  justify-content: start;
  width: 100%;
  max-width: 100%;
}

.picked {
  height: 0;
  min-height: 100%;
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
}

.pickedEmpty {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.pickedList {
  margin: 0;
  list-style: none;
  padding: 0;
}

.pickedItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
}

.pickedIcon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.pickedName {
  min-width: 0;
  flex: 1;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--color-ink);
}

.pickedCount {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-gold);
}

.crystalStage {
  width: 22rem;
  max-width: 100%;
  min-width: 0;
  height: max-content;
  align-self: start;
  justify-self: start;
}

.relicStage {
  width: 100%;
  max-width: 18rem;
}

.hardeningStage {
  width: 100%;
  min-width: 0;
}

@media (max-width: 1280px) {
  .gearBlock {
    grid-template-columns: 1fr;
  }

  .buffCol {
    max-height: none !important;
  }
}

@media (max-width: 720px) {
  .crystalLayout {
    grid-template-columns: 1fr;
  }

  .picked {
    height: auto;
    min-height: 0;
    max-height: 12rem;
  }

  .crystalStage {
    width: min(100%, 32rem);
    margin-inline: auto;
  }
}
</style>
