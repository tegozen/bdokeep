<template>
  <UiModal
    :open="open"
    title="Баннер набора"
    aria-label="Редактирование баннера набора"
    size="lg"
    @close="onClose"
  >
    <form :class="$style.form" @submit.prevent="save">
      <UiSwitch v-model="enabled" label="Показывать на главной и страницах классов" />

      <label :class="$style.label">
        Текст
        <textarea
          v-model="body"
          :class="$style.textarea"
          rows="3"
          maxlength="280"
          placeholder="Короткий текст о наборе"
        />
        <span :class="$style.hint">{{ body.length }} / 280</span>
      </label>

      <div :class="$style.block">
        <span :class="$style.fieldTitle">Иконка</span>
        <div :class="$style.iconRow">
          <img
            v-if="previewSrc"
            :src="previewSrc"
            alt=""
            width="48"
            height="48"
            :class="$style.preview"
          >
          <span v-else :class="$style.muted">Нет иконки</span>
          <label :class="$style.fileBtn">
            Выбрать файл
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              :class="$style.fileInput"
              @change="onIconPick"
            >
          </label>
          <UiButton
            v-if="previewSrc || pendingClearIcon"
            variant="ghost"
            type="button"
            size="sm"
            @click="clearIcon"
          >
            Убрать
          </UiButton>
        </div>
        <p v-if="iconError" :class="$style.error">{{ iconError }}</p>
        <p :class="$style.hint">PNG / JPEG / WebP / GIF, до 128 КБ</p>
      </div>

      <div :class="$style.block">
        <div :class="$style.linksHead">
          <span :class="$style.fieldTitle">Ссылки</span>
          <UiButton
            variant="ghost"
            type="button"
            size="sm"
            :disabled="links.length >= 10"
            @click="addLink"
          >
            Добавить
          </UiButton>
        </div>
        <p v-if="!links.length" :class="$style.muted">Можно сохранить без ссылок.</p>
        <ul v-else :class="$style.linkList">
          <li v-for="(link, i) in links" :key="i" :class="$style.linkRow">
            <input
              v-model="link.label"
              type="text"
              :class="$style.input"
              maxlength="40"
              placeholder="Подпись"
              aria-label="Подпись ссылки"
            >
            <input
              v-model="link.url"
              type="url"
              :class="$style.input"
              placeholder="https://"
              aria-label="URL ссылки"
            >
            <UiButton variant="ghost" type="button" size="sm" @click="removeLink(i)">
              ×
            </UiButton>
          </li>
        </ul>
      </div>

      <p v-if="saveError" :class="$style.error">{{ saveError }}</p>

      <div :class="$style.actions">
        <UiButton type="submit" :disabled="saving || loading">
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </UiButton>
        <UiButton variant="ghost" type="button" :disabled="saving" @click="onClose">
          Отмена
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { UiButton, UiModal, UiSwitch } from '@/shared/ui'
import type { GuildBannerLink, GuildBannerPublic } from '../model/types'

type BannerAdmin = {
  enabled: boolean
  body: string
  has_icon: boolean
  links: GuildBannerLink[]
  updated_at: string | null
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [GuildBannerPublic]
}>()

const loading = ref(false)
const saving = ref(false)
const saveError = ref('')
const iconError = ref('')
const enabled = ref(true)
const body = ref('')
const links = ref<GuildBannerLink[]>([])
const hasIcon = ref(false)
const updatedAt = ref<string | null>(null)
const pendingIconBase64 = ref<string | null>(null)
const pendingIconMime = ref<string | null>(null)
const pendingClearIcon = ref(false)
const localPreview = ref<string | null>(null)

const previewSrc = computed(() => {
  if (pendingClearIcon.value) return null
  if (localPreview.value) return localPreview.value
  if (hasIcon.value && updatedAt.value) {
    return `/api/guild-banner/icon?v=${encodeURIComponent(updatedAt.value)}`
  }
  if (hasIcon.value) return '/api/guild-banner/icon'
  return null
})

function revokePreview() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
    localPreview.value = null
  }
}

function resetPending() {
  pendingIconBase64.value = null
  pendingIconMime.value = null
  pendingClearIcon.value = false
  revokePreview()
}

function applyAdmin(res: BannerAdmin) {
  enabled.value = res.enabled
  body.value = res.body || ''
  links.value = (res.links || []).map((l) => ({ label: l.label, url: l.url }))
  hasIcon.value = res.has_icon
  updatedAt.value = res.updated_at
  resetPending()
}

function toPublic(res: BannerAdmin): GuildBannerPublic {
  if (!res.enabled) return { enabled: false }
  return {
    enabled: true,
    body: res.body || '',
    has_icon: res.has_icon,
    links: (res.links || []).map((l) => ({ label: l.label, url: l.url })),
    updated_at: res.updated_at || new Date().toISOString(),
  }
}

async function load() {
  loading.value = true
  saveError.value = ''
  iconError.value = ''
  try {
    const res = await $fetch<BannerAdmin>('/api/admin/guild-banner')
    applyAdmin(res)
  } catch {
    saveError.value = 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
}

function onClose() {
  emit('close')
}

function addLink() {
  if (links.value.length >= 10) return
  links.value.push({ label: '', url: '' })
}

function removeLink(i: number) {
  links.value.splice(i, 1)
}

function clearIcon() {
  pendingIconBase64.value = null
  pendingIconMime.value = null
  pendingClearIcon.value = true
  revokePreview()
  iconError.value = ''
}

async function onIconPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  iconError.value = ''
  if (!file) return

  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    iconError.value = 'Только PNG, JPEG, WebP или GIF'
    return
  }
  if (file.size > 128 * 1024) {
    iconError.value = 'Файл больше 128 КБ'
    return
  }

  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  pendingIconBase64.value = btoa(binary)
  pendingIconMime.value = file.type
  pendingClearIcon.value = false
  revokePreview()
  localPreview.value = URL.createObjectURL(file)
}

async function save() {
  saveError.value = ''
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      enabled: enabled.value,
      body: body.value,
      links: links.value.filter((l) => l.label.trim() || l.url.trim()),
    }
    if (pendingClearIcon.value) {
      payload.clear_icon = true
    } else if (pendingIconBase64.value && pendingIconMime.value) {
      payload.icon_base64 = pendingIconBase64.value
      payload.icon_mime = pendingIconMime.value
    }

    const res = await $fetch<BannerAdmin & { ok: true }>('/api/admin/guild-banner', {
      method: 'PUT',
      body: payload,
    })
    applyAdmin(res)
    emit('saved', toPublic(res))
    emit('close')
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    saveError.value = msg || 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void load()
    else {
      saveError.value = ''
      iconError.value = ''
      resetPending()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  revokePreview()
})
</script>

<style module>
.form {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.1rem 1.25rem;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.fieldTitle {
  font-size: 0.9rem;
  color: var(--color-muted);
}

.block {
  display: grid;
  gap: 0.45rem;
}

.input,
.textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.45rem 0.65rem;
}

.input {
  min-height: 2rem;
  line-height: 1;
}

.textarea {
  resize: vertical;
  min-height: 4.5rem;
  line-height: 1.4;
}

.hint {
  font-size: 0.78rem;
  color: var(--color-muted);
}

.iconRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.preview {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  background: var(--color-bg);
}

.fileBtn {
  position: relative;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
}

.fileBtn:hover {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
}

.fileInput {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.linksHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.linkList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.5rem;
  max-height: calc(3 * 2.2rem + 2 * 0.5rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.linkRow {
  display: grid;
  grid-template-columns: minmax(0, 8rem) minmax(0, 1fr) auto;
  gap: 0.4rem;
  align-items: center;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

@media (max-width: 560px) {
  .linkRow {
    grid-template-columns: 1fr;
  }
}
</style>
