<template>
  <div :class="$style.page">
    <div v-if="error && !pending" :class="$style.error">
      Не удалось загрузить гайд. Проверьте API и обновите страницу.
    </div>

    <template v-if="pending">
      <div v-for="n in 5" :key="n" :class="$style.skel">
        <UiSkeleton variant="text" width="30%" height="1.4rem" />
        <UiSkeleton variant="block" height="120px" :class="$style.skelGap" />
      </div>
    </template>

    <template v-else-if="error">
      <!-- message above -->
    </template>

    <template v-else-if="!bundle">
      <ShowEmptyGuide
        title="Класс не найден"
        description="Такого класса нет или он скрыт."
      />
    </template>

    <template v-else>
      <div :class="$style.comboMorphRow">
        <div :class="$style.comboMorphCell">
          <GuideSection
            flush
            title="Роль на осаде"
            :subtitle="sectionSubtitle('summary')"
          >
            <template v-if="summaryPendingCount" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                summaryPendingCount
              }}</span>
            </template>
            <template #actions>
              <ProposeLazy
                :key="summarySection"
                :loader="() => import('@/features/propose-guide/ui/ProposeSummaryForm.vue')"
                :form-props="{
                  classSlug: bundle.class.slug,
                  section: summarySection,
                  initialText: activeSummary,
                }"
              />
            </template>
            <div v-if="activeSummary" :class="[$style.summary, $style.fade]">
              <UiMarkdownPreview
                id="class-summary-preview"
                :model-value="activeSummary"
              />
            </div>
            <ShowEmptyGuide v-else />
          </GuideSection>
        </div>

        <div :class="$style.comboMorphCell">
          <GuideSection
            flush
            title="Комба"
            :subtitle="sectionSubtitle('combo')"
          >
            <template v-if="comboPendingCount" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                comboPendingCount
              }}</span>
            </template>
            <template #actions>
              <ProposeLazy
                :key="`${comboSection}-${comboKind}`"
                :loader="() => import('@/features/propose-guide/ui/ProposeComboForm.vue')"
                :form-props="{
                  classSlug: bundle.class.slug,
                  section: comboSection,
                  kind: comboKind,
                  initialCombos: activeCombos,
                }"
              />
            </template>

            <div
              v-if="activeCombos.length"
              :class="[$style.comboBlock, $style.fade]"
            >
              <div
                v-for="(combo, idx) in activeCombos"
                :key="combo.id"
                :class="$style.comboItem"
              >
                <p v-if="combo.notes" :class="$style.comboNotes">{{ combo.notes }}</p>
                <ComboChain
                  :steps="combo.steps"
                  :label="
                    combo.notes ||
                    (specMode === 'succession'
                      ? `Комба наследия · ${comboKindLabel(comboKind)}`
                      : `Комба пробуждения · ${comboKindLabel(comboKind)}`)
                  "
                />
              </div>
            </div>
            <ShowEmptyGuide v-else />
          </GuideSection>
        </div>

        <div :class="$style.comboMorphCell">
          <GuideSection
            flush
            title="Морфы"
            :subtitle="sectionSubtitle('morphs')"
          >
            <template v-if="sectionCount('morphs')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                sectionCount("morphs")
              }}</span>
            </template>
            <template #actions>
              <ProposeLazy
                :loader="() => import('@/features/propose-guide/ui/ProposeMorphForm.vue')"
                :form-props="{
                  classSlug: bundle.class.slug,
                  initialMorphs: bundle.morphs,
                }"
              />
            </template>
            <div :class="[$style.morphStage, $style.fade]">
              <MorphBoard :filled="morphFilled" />
            </div>
          </GuideSection>
        </div>

        <template v-if="isSuperadmin && topDraftsVisible">
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="summaryPending"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="comboPending"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('morphs')"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
        </template>
      </div>

      <div :class="$style.gearBlock">
        <div :class="[$style.gearCell, $style.gearLive]">
          <GuideSection
            flush
            title="Инкрустация"
            :subtitle="sectionSubtitle('crystals')"
          >
            <template v-if="sectionCount('crystals')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                sectionCount("crystals")
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
                <p v-if="!crystalPickedList.length" :class="$style.pickedEmpty">
                  Пока пусто
                </p>
                <ul v-else :class="$style.pickedList">
                  <li
                    v-for="row in crystalPickedList"
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
                <CrystalBoard :filled="crystalFilled" />
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
            <template v-if="sectionCount('relics')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                sectionCount("relics")
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
                :filled="relicFilled"
                :lightstone-set-name="lightstoneSetLabel"
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
            <template v-if="sectionCount('hardening')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                sectionCount("hardening")
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
              <HardeningBoard list-only :filled="hardeningFilled" />
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
            <template v-if="sectionCount('buffs')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                sectionCount("buffs")
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
                      row.buffs?.name_ru || row.slot || "Слот"
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

        <template v-if="isSuperadmin && gearDraftsVisible">
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              v-if="sectionCount('crystals')"
              :proposals="pendingFor('crystals')"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              v-if="sectionCount('relics')"
              :proposals="pendingFor('relics')"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              v-if="sectionCount('hardening')"
              :proposals="pendingFor('hardening')"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              v-if="sectionCount('buffs')"
              :proposals="pendingFor('buffs')"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
        </template>
      </div>

      <div :class="$style.videoBlock">
        <div :class="[$style.videoCell, $style.videoLive]">
          <GuideSection
            flush
            title="Видео"
            :subtitle="sectionSubtitle('videos')"
          >
            <template v-if="videosPendingCount" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{
                videosPendingCount
              }}</span>
            </template>
            <template #actions>
              <ProposeLazy
                :key="videosSection"
                :loader="() => import('@/features/propose-guide/ui/ProposeVideosForm.vue')"
                :form-props="{
                  classSlug: bundle.class.slug,
                  section: videosSection,
                  initialVideos: activeVideos,
                }"
              />
            </template>
            <VideoList :videos="activeVideos" />
          </GuideSection>
        </div>

        <template v-if="isSuperadmin && videoDraftsVisible">
          <div :class="[$style.videoCell, $style.videoDraft]">
            <PendingSectionDrafts
              :proposals="videosPending"
              @changed="onDraftChanged"
              @optimistic-remove="onOptimisticRemove"
              @optimistic-restore="onOptimisticRestore"
            />
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { comboKindFromPreset, comboKindLabel } from "@domain";
import {
  type ClassGuideBundle,
  fetchLightstoneSets,
} from "@/entities/class";
import ProposeLazy from "@/features/propose-guide/ui/ProposeLazy.vue";
import {
  fetchPendingForClass,
  type PendingProposal,
} from "@/features/superadmin-auth/api/pendingProposals";
import PendingSectionDrafts from "@/features/superadmin-auth/ui/PendingSectionDrafts.vue";
import { ShowEmptyGuide } from "@/features/show-empty-guide";
import {
  codexIconSrc,
  computePresetFill,
  emptyPresetFill,
  formatLightstoneSetLabel,
  formatSectionUpdated,
  matchLightstoneSet,
  morphPresetFrom,
  parseSectionUpdates,
  sectionUpdateKey,
  useGuidePreset,
  useGuideSpecMode,
  useHeaderPresetFill,
  usePendingSummary,
  useSuperadmin,
  type GuideUiSection,
} from "@/shared/lib";
import UiMarkdownPreview from "@/shared/ui/UiMarkdownPreview.vue";
import UiSkeleton from "@/shared/ui/UiSkeleton.vue";
import { ComboChain } from "@/widgets/combo-chain";
import { CrystalBoard } from "@/widgets/crystal-board";
import { GuideSection } from "@/widgets/guide-section";
import { HardeningBoard } from "@/widgets/hardening-board";
import { MorphBoard } from "@/widgets/morph-board";
import { RelicBoard } from "@/widgets/relic-board";
import { VideoList } from "@/widgets/video-list";
import { useGuideBoardFills } from "../lib/useGuideBoardFills";

const props = defineProps<{
  bundle: ClassGuideBundle | null;
  pending: boolean;
  error?: boolean;
}>();

const { isSuperadmin } = useSuperadmin();
const headerPresetFill = useHeaderPresetFill();
const { refresh: refreshPendingSummary, adjust: adjustPendingSummary } =
  usePendingSummary();
const classPending = ref<PendingProposal[]>([]);
const pendingRestoreAt = new Map<string, number>();
const specMode = useGuideSpecMode();
const guidePreset = useGuidePreset();

const sectionUpdates = computed(() =>
  parseSectionUpdates(props.bundle?.guide?.section_updates),
);

function sectionSubtitle(key: GuideUiSection) {
  const metaKey = sectionUpdateKey(key, specMode.value);
  return formatSectionUpdated(sectionUpdates.value[metaKey]);
}

watch(
  () => props.bundle,
  (b) => {
    headerPresetFill.value = computePresetFill(b);
  },
  { immediate: true, deep: true },
);

async function loadClassPending() {
  if (!isSuperadmin.value || !props.bundle?.class.slug) {
    classPending.value = [];
    return;
  }
  try {
    classPending.value = await fetchPendingForClass(props.bundle.class.slug);
  } catch {
    classPending.value = [];
  }
}

function onOptimisticRemove(item: PendingProposal) {
  const index = classPending.value.findIndex((p) => p.id === item.id);
  if (index >= 0) pendingRestoreAt.set(item.id, index);
  classPending.value = classPending.value.filter((p) => p.id !== item.id);
  adjustPendingSummary(-1, item.class_slug);
}

function onOptimisticRestore(item: PendingProposal) {
  if (classPending.value.some((p) => p.id === item.id)) return;
  const index = pendingRestoreAt.get(item.id) ?? classPending.value.length;
  pendingRestoreAt.delete(item.id);
  const next = [...classPending.value];
  next.splice(Math.min(index, next.length), 0, item);
  classPending.value = next;
  adjustPendingSummary(1, item.class_slug);
}

function pendingFor(section: string) {
  return classPending.value.filter((p) => p.section === section);
}

function sectionCount(section: string) {
  return pendingFor(section).length;
}

const comboPending = computed(() =>
  classPending.value.filter(
    (p) => p.section === "combo_awakening" || p.section === "combo_succession",
  ),
);
const comboPendingCount = computed(() => comboPending.value.length);

const summarySection = computed(() =>
  specMode.value === "succession"
    ? ("summary_succession" as const)
    : ("summary_awakening" as const),
);
const videosSection = computed(() =>
  specMode.value === "succession"
    ? ("videos_succession" as const)
    : ("videos_awakening" as const),
);

const summaryPending = computed(() => pendingFor(summarySection.value));
const summaryPendingCount = computed(() => summaryPending.value.length);
const videosPending = computed(() => pendingFor(videosSection.value));
const videosPendingCount = computed(() => videosPending.value.length);

const gearDraftsVisible = computed(
  () =>
    sectionCount("crystals") > 0 ||
    sectionCount("relics") > 0 ||
    sectionCount("buffs") > 0 ||
    sectionCount("hardening") > 0,
);

const topDraftsVisible = computed(
  () =>
    summaryPendingCount.value > 0 ||
    comboPendingCount.value > 0 ||
    sectionCount("morphs") > 0,
);

const videoDraftsVisible = computed(() => videosPendingCount.value > 0);

async function onDraftChanged(action: "approve" | "reject") {
  if (action === "approve" && props.bundle?.class.slug) {
    await refreshNuxtData(`class-${props.bundle.class.slug}`);
  }
  // Quiet reconcile badge with server (list already updated optimistically)
  void refreshPendingSummary();
}

// Session is resolved in plugins/superadmin-session.ts before this page runs.
// Await pending drafts on first paint so huge draft cards don't insert mid-scroll.
if (isSuperadmin.value && props.bundle?.class.slug) {
  await loadClassPending();
}

watch(
  [isSuperadmin, () => props.bundle?.class.slug],
  () => {
    void loadClassPending();
  },
);

const activeMorphPreset = computed(() =>
  morphPresetFrom(specMode.value, guidePreset.value),
);

onBeforeUnmount(() => {
  headerPresetFill.value = emptyPresetFill();
});

const comboKind = computed(() => comboKindFromPreset(guidePreset.value));
const awakeningCombos = computed(
  () =>
    props.bundle?.combos
      .filter(
        (c) =>
          c.mode === "awakening" && (c.kind || "pvp") === comboKind.value,
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order) ?? [],
);
const successionCombos = computed(
  () =>
    props.bundle?.combos
      .filter(
        (c) =>
          c.mode === "succession" && (c.kind || "pvp") === comboKind.value,
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order) ?? [],
);
const activeCombos = computed(() =>
  specMode.value === "succession"
    ? successionCombos.value
    : awakeningCombos.value,
);
const comboSection = computed(() =>
  specMode.value === "succession"
    ? ("combo_succession" as const)
    : ("combo_awakening" as const),
);

const activeSummary = computed(() => {
  const guide = props.bundle?.guide;
  if (!guide) return null;
  const text =
    specMode.value === "succession"
      ? guide.summary_succession
      : guide.summary_awakening;
  return text?.trim() ? text : null;
});

const activeVideos = computed(
  () =>
    props.bundle?.videos.filter(
      (v) => (v.mode || "awakening") === specMode.value,
    ) ?? [],
);

const activeBuffs = computed(() =>
  (props.bundle?.buffs ?? []).filter(
    (row) => (row.preset || "t1") === guidePreset.value,
  ),
);

const bundleRef = computed(() => props.bundle);
const {
  crystalFilled,
  crystalPickedList,
  relicFilled,
  morphFilled,
  hardeningFilled,
} = useGuideBoardFills(bundleRef, guidePreset, activeMorphPreset);

const { data: lightstoneSets } = useAsyncData(
  "catalog-lightstone-sets",
  () => fetchLightstoneSets(),
  { lazy: true, default: () => [] },
);

const lightstoneSetLabel = computed(() =>
  formatLightstoneSetLabel(
    matchLightstoneSet(relicFilled.value, lightstoneSets.value ?? []),
  ),
);
</script>

<style module>
.page {
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
}

.error {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  padding: 1rem 1.25rem;
  color: var(--color-danger);
}

.skel {
  margin-bottom: 1.5rem;
}

.skelGap {
  margin-top: 0.75rem;
}

.summary {
  min-width: 0;
  max-width: 100%;
  min-height: 1.5rem;
  /* Cap so long siege-role markdown scrolls inside the cell, not the page. */
  max-height: min(28rem, 60vh);
  overflow: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
}

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

.list {
  margin: 0;
  display: grid;
  list-style: none;
  gap: 0.75rem;
  padding: 0;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.75rem;
}

.icon {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
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

.comboBlock {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem 1.15rem;
}

.comboItem + .comboItem {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.comboTitle {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-ink);
}

.comboNotes {
  margin: 0 0 0.55rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.comboMorphRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  margin-bottom: 2.5rem;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.comboMorphCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.comboMorphDraft {
  display: flex;
  flex-direction: column;
  /* Reserve draft chrome so catalog hydrate doesn't grow the page mid-scroll. */
  height: min(32rem, 70vh);
  min-height: min(32rem, 70vh);
  overflow: visible;
  padding: 0;
}

.comboMorphDraft > * {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.morphStage {
  width: 100%;
  min-width: 0;
}

.gearBlock {
  display: grid;
  /* crystals | relics | hardening (fit 5 slots) | buffs (rest) */
  grid-template-columns: auto auto auto minmax(14rem, 1fr);
  gap: 1px;
  margin-bottom: 2.5rem;
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

.videoBlock {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.videoCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.videoDraft {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
  padding: 0;
}

.videoDraft > * {
  flex: 1;
  min-height: 0;
}

@media (max-width: 1280px) {
  .gearBlock {
    grid-template-columns: 1fr;
  }

  .buffCol {
    max-height: none !important;
  }
}

@media (max-width: 1100px) {
  .comboMorphRow {
    grid-template-columns: 1fr;
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
