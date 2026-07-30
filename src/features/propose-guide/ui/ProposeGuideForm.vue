<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.trigger" @click="open = true">
      {{ triggerLabel }}
    </button>

    <Teleport to="body">
      <div v-if="open" :class="$style.backdrop" @click.self="close">
        <div
          :class="$style.modal"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">{{ title }}</h3>
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

            <SuperadminAuth />

            <template v-if="isCombo">
              <p :class="$style.hint">
                Комба {{ isSuccessionCombo ? 'наследия' : 'пробуждения' }} — выберите скиллы по порядку.
              </p>
              <div :class="$style.tabs" role="tablist" aria-label="Тип скиллов">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="catalogTab === 'main'"
                  :class="[$style.tab, catalogTab === 'main' && $style.tabOn]"
                  @click="catalogTab = 'main'"
                >
                  Основные
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="catalogTab === 'spec'"
                  :class="[$style.tab, catalogTab === 'spec' && $style.tabOn]"
                  @click="catalogTab = 'spec'"
                >
                  {{ isSuccessionCombo ? 'Наследие' : 'Пробуждение' }}
                </button>
              </div>
              <label :class="$style.label">
                Поиск
                <input v-model="query" type="search" :class="$style.input" placeholder="Название скилла">
              </label>

              <div v-if="skillsPending" :class="$style.muted">Загрузка скиллов…</div>
              <div v-else-if="skillsError" :class="$style.error">Не удалось загрузить скиллы.</div>
              <ul v-else :class="$style.catalog">
                <li v-for="skill in filteredSkills" :key="skill.id">
                  <button type="button" :class="$style.catalogBtn" @click="addSkill(skill)">
                    <img
                      v-if="skill.icon_url"
                      :src="skill.icon_url"
                      alt=""
                      :class="$style.icon"
                      loading="lazy"
                    >
                    <span>{{ skill.name_ru }}</span>
                    <span :class="$style.add">+</span>
                  </button>
                </li>
              </ul>
              <p v-if="!skillsPending && !skillsError && !filteredSkills.length" :class="$style.muted">
                Нет скиллов в этой вкладке{{ query ? ' по поиску' : '' }}.
              </p>

              <div :class="$style.pickedHead">
                Цепочка ({{ picked.length }}/30)
                <span v-if="picked.length" :class="$style.dragHint">перетащите, чтобы поменять местами</span>
              </div>
              <ol v-if="picked.length" :class="$style.picked">
                <li
                  v-for="(skill, i) in picked"
                  :key="`${skill.id}-${i}`"
                  :class="$style.step"
                >
                  <span v-if="i > 0" :class="$style.arrow" aria-hidden="true">→</span>
                  <div
                    :class="[
                      $style.tile,
                      dragFrom === i && $style.tileDragging,
                      dragOver === i && dragFrom !== i && $style.tileOver,
                    ]"
                    draggable="true"
                    :title="skill.name_ru"
                    @dragstart="onDragStart(i, $event)"
                    @dragend="onDragEnd"
                    @dragover.prevent="onDragOver(i)"
                    @drop.prevent="onDrop(i)"
                  >
                    <img
                      v-if="skill.icon_url"
                      :src="skill.icon_url"
                      alt=""
                      :class="$style.tileIcon"
                      draggable="false"
                      loading="lazy"
                    >
                    <span v-else :class="$style.tileFallback">?</span>
                    <span :class="$style.tileName">{{ skill.name_ru }}</span>
                    <button
                      type="button"
                      :class="$style.tileRemove"
                      :aria-label="`Убрать ${skill.name_ru}`"
                      @click.stop="removeAt(i)"
                      @mousedown.stop
                    >
                      ✕
                    </button>
                  </div>
                </li>
              </ol>
              <p v-else :class="$style.muted">Пока пусто — нажмите скилл в списке выше.</p>
            </template>

            <template v-else>
              <label :class="$style.label">
                Текст
                <textarea
                  v-model="text"
                  :class="$style.textarea"
                  rows="6"
                  required
                  maxlength="8000"
                  placeholder="Предложенный текст…"
                />
              </label>
            </template>

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
                  submitting
                    ? 'Отправка…'
                    : isSuperadmin
                      ? 'Опубликовать'
                      : 'Отправить'
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchClassSkills, type ProposalSection, type Skill } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import { useModalEscape, useSuperadmin } from '@/shared/lib'
import { submitGuideProposal } from '../api/submitProposal'
import { skillCatalogBucket } from '../lib/skillBucket'

const props = withDefaults(
  defineProps<{
    classSlug: string
    section: ProposalSection
    triggerLabel?: string
  }>(),
  {
    triggerLabel: 'Предложить',
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const text = ref('')
const author = ref('')
const query = ref('')
const catalogTab = ref<'main' | 'spec'>('main')
const picked = ref<Skill[]>([])
const skills = ref<Skill[]>([])
const skillsPending = ref(false)
const skillsError = ref(false)
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)

useModalEscape(open, close)

const isCombo = computed(
  () => props.section === 'combo_awakening' || props.section === 'combo_succession',
)
const isSuccessionCombo = computed(() => props.section === 'combo_succession')

const title = computed(() => {
  switch (props.section) {
    case 'summary':
      return 'Предложить суть'
    case 'combo_awakening':
      return 'Комба: пробуждение'
    case 'combo_succession':
      return 'Комба: наследие'
    default:
      return 'Предложить правку'
  }
})

const filteredSkills = computed(() => {
  const want = catalogTab.value === 'main' ? 'main' : isSuccessionCombo.value ? 'succession' : 'awakening'
  const q = query.value.trim().toLowerCase()
  return skills.value.filter((s) => {
    if (skillCatalogBucket(s) !== want) return false
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

watch(catalogTab, () => {
  formError.value = ''
})

function addSkill(skill: Skill) {
  if (picked.value.length >= 30) {
    formError.value = 'Максимум 30 шагов'
    return
  }
  formError.value = ''
  picked.value = [...picked.value, skill]
}

function removeAt(i: number) {
  picked.value = picked.value.filter((_, idx) => idx !== i)
}

function onDragStart(i: number, e: DragEvent) {
  dragFrom.value = i
  dragOver.value = i
  e.dataTransfer?.setData('text/plain', String(i))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number) {
  dragOver.value = i
}

function onDrop(i: number) {
  const from = dragFrom.value
  if (from == null || from === i) {
    onDragEnd()
    return
  }
  const next = [...picked.value]
  const [item] = next.splice(from, 1)
  if (!item) {
    onDragEnd()
    return
  }
  next.splice(i, 0, item)
  picked.value = next
  onDragEnd()
}

function onDragEnd() {
  dragFrom.value = null
  dragOver.value = null
}

function close() {
  open.value = false
}

function reset() {
  text.value = ''
  author.value = ''
  honeypot.value = ''
  query.value = ''
  catalogTab.value = 'main'
  picked.value = []
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
  dragFrom.value = null
  dragOver.value = null
}

watch(open, async (v) => {
  if (v) {
    formError.value = ''
    done.value = false
    doneMessage.value = ''
    await refreshAdmin()
    if (isCombo.value && !skills.value.length) {
      skillsPending.value = true
      skillsError.value = false
      try {
        skills.value = await fetchClassSkills(props.classSlug)
      } catch {
        skillsError.value = true
      } finally {
        skillsPending.value = false
      }
    }
  } else {
    reset()
  }
})

async function onSubmit() {
  formError.value = ''
  submitting.value = true
  try {
    const payload = isCombo.value
      ? {
          mode: isSuccessionCombo.value ? 'succession' : 'awakening',
          skill_ids: picked.value.map((s) => s.id),
        }
      : { text: text.value.trim() }

    if (isCombo.value && !picked.value.length) {
      formError.value = 'Добавьте хотя бы один скилл'
      return
    }

    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload,
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
    done.value = true
    if (res.autoApproved) {
      doneMessage.value = 'Опубликовано сразу. Обновляю страницу…'
      setTimeout(() => {
        reloadNuxtApp()
      }, 600)
    } else {
      doneMessage.value = 'Отправлено на модерацию. Спасибо!'
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Не удалось отправить. Попробуйте позже.'
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
  border: 1px solid var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.75rem;
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
  background: rgba(0, 0, 0, 0.55);
  padding: 1rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.modal {
  width: min(100%, 34rem);
  max-height: min(90vh, 44rem);
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.head {
  display: flex;
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
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}

.honey {
  position: absolute;
  left: -9999px;
  height: 0;
  width: 0;
  opacity: 0;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.input,
.textarea {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.5rem 0.65rem;
}

.textarea {
  resize: vertical;
  min-height: 7rem;
}

.hint {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  padding: 0.45rem 0.5rem;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.catalog {
  margin: 0;
  max-height: 10rem;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0;
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

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.pickedHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.dragHint {
  font-size: 0.8rem;
  opacity: 0.75;
}

.picked {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem 0.2rem;
  list-style: none;
  padding: 0;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.arrow {
  margin: 0 0.1rem;
  color: var(--color-gold-soft);
  font-size: 0.95rem;
  align-self: center;
}

.tile {
  position: relative;
  display: flex;
  width: 4.5rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: grab;
  padding: 0.4rem 0.3rem 0.35rem;
  user-select: none;
  touch-action: none;
}

.tile:active {
  cursor: grabbing;
}

.tileDragging {
  opacity: 0.45;
}

.tileOver {
  border-color: var(--color-border-strong);
  box-shadow: inset 0 0 0 1px var(--color-gold-soft);
}

.tileIcon {
  width: 2.75rem;
  height: 2.75rem;
  background: #000;
  object-fit: contain;
  pointer-events: none;
}

.tileFallback {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  background: #000;
  color: var(--color-muted);
}

.tileName {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-ink);
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}

.tileRemove {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  border: 0;
  background: rgba(0, 0, 0, 0.65);
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.15rem 0.25rem;
}

.tileRemove:hover {
  color: var(--color-danger);
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
</style>
