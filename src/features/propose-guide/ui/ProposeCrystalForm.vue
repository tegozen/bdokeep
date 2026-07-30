<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.trigger" @click="open = true">
      {{ triggerLabel }}
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :class="[$style.backdrop, obscured && $style.obscured]"
        @click.self="close"
      >
        <div
          :class="$style.modal"
          role="dialog"
          aria-modal="true"
          aria-label="Предложить инкрустацию"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Предложить инкрустацию</h3>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="close">
              ×
            </button>
          </header>

          <form :class="$style.form" @submit.prevent="onSubmit">
            <input
              v-model="honeypot"
              type="text"
              name="website"
              autocomplete="off"
              tabindex="-1"
              :class="$style.honey"
              aria-hidden="true"
            >

            <div :class="$style.workspace">
              <div :class="$style.left">
                <CrystalBoard
                  :filled="filledMap"
                  :selected-id="activeSlot"
                  interactive
                  @select="onSelectSlot"
                />
              </div>

              <div :class="$style.right">
                <input
                  v-model="query"
                  type="search"
                  :class="$style.input"
                  placeholder="Название кристалла"
                  aria-label="Поиск кристалла"
                  :disabled="!activeSlot"
                >

                <div v-if="catalogPending" :class="$style.muted">Загрузка кристаллов…</div>
                <div v-else-if="catalogError" :class="$style.error">Не удалось загрузить кристаллы.</div>
                <ul v-else :class="[$style.catalog, !activeSlot && $style.catalogOff]">
                  <li v-if="activeSlot">
                    <button type="button" :class="$style.catalogBtn" @click="clearSlot">
                      <span :class="$style.clearIcon">∅</span>
                      <span>Очистить слот</span>
                    </button>
                  </li>
                  <li v-for="item in filteredCatalog" :key="item.id">
                    <button type="button" :class="$style.catalogBtn" @click="assignCrystal(item)">
                      <img
                        v-if="item.icon_url"
                        :src="item.icon_url"
                        alt=""
                        :class="$style.icon"
                        loading="lazy"
                      >
                      <span>{{ item.name_ru }}</span>
                      <span :class="$style.add">+</span>
                    </button>
                  </li>
                </ul>
                <p
                  v-if="activeSlot && !catalogPending && !catalogError && !filteredCatalog.length"
                  :class="$style.muted"
                >
                  Нет {{
                    isDawnSlotId(activeSlot)
                      ? 'кристаллов рассвета'
                      : isCenterSlotId(activeSlot)
                        ? 'камней духов'
                        : 'кристаллов'
                  }}{{ query ? ' по поиску' : '' }}.
                </p>

                <SuperadminAuth />

                <label v-if="!isSuperadmin" :class="$style.label">
                  Ник / Discord (необязательно)
                  <input v-model="author" type="text" :class="$style.input" maxlength="80">
                </label>

                <p v-if="formError" :class="$style.error">{{ formError }}</p>
                <p v-if="done" :class="$style.ok">{{ doneMessage }}</p>

                <div :class="$style.actions">
                  <button type="button" :class="$style.secondary" @click="close">Отмена</button>
                  <button type="submit" :class="$style.primary" :disabled="submitting || done">
                    {{
                      submitting ? 'Отправка…' : isSuperadmin ? 'Опубликовать' : 'Отправить'
                    }}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchCrystals, type Item } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import {
  isCenterSlotId,
  isDawnCrystalName,
  isDawnSlotId,
  isSpiritCrystalName,
  useModalEscape,
  useSuperadmin,
} from '@/shared/lib'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { submitGuideProposal } from '../api/submitProposal'

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
  }>(),
  {
    triggerLabel: 'Предложить инкрустацию',
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const author = ref('')
const query = ref('')
const activeSlot = ref<string | null>(null)
/** slotId → crystal item */
const slots = ref<Record<string, Item>>({})
const crystals = ref<Item[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')

const { obscured } = useModalEscape(open, close)

const filledMap = computed(() => {
  const map: Record<string, CrystalFill> = {}
  for (const [id, item] of Object.entries(slots.value)) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const slot = activeSlot.value
  const dawnSlot = slot ? isDawnSlotId(slot) : false
  const centerSlot = slot ? isCenterSlotId(slot) : false
  return crystals.value.filter((c) => {
    const isDawn = isDawnCrystalName(c.name_ru)
    const isSpirit = isSpiritCrystalName(c.name_ru)
    if (dawnSlot) {
      if (!isDawn) return false
    } else if (centerSlot) {
      if (!isSpirit) return false
    } else if (isDawn || isSpirit) {
      return false
    }
    if (!q) return true
    return c.name_ru.toLowerCase().includes(q)
  })
})

watch(open, async (v) => {
  if (!v) return
  formError.value = ''
  done.value = false
  await refreshAdmin()
  if (!crystals.value.length) {
    catalogPending.value = true
    catalogError.value = false
    try {
      crystals.value = await fetchCrystals()
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  }
})

function onSelectSlot(id: string) {
  activeSlot.value = id
  formError.value = ''
}

function assignCrystal(item: Item) {
  if (!activeSlot.value) return
  const dawnSlot = isDawnSlotId(activeSlot.value)
  const centerSlot = isCenterSlotId(activeSlot.value)
  const dawnItem = isDawnCrystalName(item.name_ru)
  const spiritItem = isSpiritCrystalName(item.name_ru)

  if (dawnSlot && !dawnItem) {
    formError.value = 'В этот слот можно только кристалл рассвета'
    return
  }
  if (centerSlot && !spiritItem) {
    formError.value = 'В центральный слот можно только камень / кристалл духа'
    return
  }
  if (!dawnSlot && dawnItem) {
    formError.value = 'Кристалл рассвета только в нижние слоты'
    return
  }
  if (!centerSlot && spiritItem) {
    formError.value = 'Камень духов только в центральный слот'
    return
  }

  formError.value = ''
  slots.value = { ...slots.value, [activeSlot.value]: item }
}

function clearSlot() {
  if (!activeSlot.value) return
  const next = { ...slots.value }
  delete next[activeSlot.value]
  slots.value = next
}

function reset() {
  honeypot.value = ''
  author.value = ''
  query.value = ''
  activeSlot.value = null
  slots.value = {}
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
}

function close() {
  open.value = false
  reset()
}

async function onSubmit() {
  formError.value = ''
  const entries = Object.entries(slots.value)
  if (!entries.length) {
    formError.value = 'Заполните хотя бы один слот'
    return
  }

  submitting.value = true
  try {
    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: 'crystals',
      payload: {
        crystals: entries.map(([slot, item], i) => ({
          slot,
          item_id: item.id,
          sort_order: i,
        })),
      },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
    done.value = true
    doneMessage.value = res.autoApproved
      ? 'Опубликовано.'
      : 'Отправлено на модерацию.'
    if (res.autoApproved) {
      setTimeout(() => {
        close()
        window.location.reload()
      }, 700)
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Не удалось отправить'
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.wrap {
  display: inline-flex;
}

.trigger {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.7rem;
}

.trigger:hover {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  transition: filter 160ms ease;
}

.obscured {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 64rem);
  max-height: min(94vh, 58rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
}

.title {
  margin: 0;
  font-size: 1.05rem;
}

.close {
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
}

.honey {
  position: absolute;
  left: -9999px;
  height: 0;
  width: 0;
  opacity: 0;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(22rem, 1.15fr) minmax(16rem, 0.95fr);
  gap: 1rem;
  align-items: start;
  min-height: 0;
  flex: 1;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 0;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.5rem 0.65rem;
}

.catalog {
  flex: none;
  height: min(28rem, 48vh);
  margin: 0;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0;
}

.catalogOff {
  opacity: 0.45;
  pointer-events: none;
}

.catalogBtn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.55rem;
  text-align: left;
}

.catalogBtn:hover {
  background: var(--color-gold-dim);
}

.add {
  margin-left: auto;
  color: var(--color-gold);
}

.clearIcon {
  display: grid;
  width: 1.6rem;
  height: 1.6rem;
  place-items: center;
  color: var(--color-muted);
}

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.primary,
.secondary {
  border: 1px solid var(--color-border);
  cursor: pointer;
  font: inherit;
  padding: 0.45rem 0.9rem;
}

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.secondary {
  background: transparent;
  color: var(--color-muted);
}

.muted {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

.ok {
  margin: 0;
  color: var(--color-gold-soft);
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .modal {
    width: min(100%, 34rem);
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .catalog {
    height: 14rem;
  }
}
</style>
