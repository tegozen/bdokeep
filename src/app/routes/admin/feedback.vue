<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <h1 :class="$style.h1">Обратная связь</h1>
      <NuxtLink v-if="authed" to="/admin/proposals?status=pending" :class="$style.link">
        К заявкам
      </NuxtLink>
    </header>

    <form v-if="!authed" :class="$style.login" @submit.prevent="login">
      <label :class="$style.label">
        Пароль админа
        <input
          v-model="password"
          type="password"
          :class="$style.input"
          required
          autocomplete="current-password"
        >
      </label>
      <p v-if="loginError" :class="$style.error">{{ loginError }}</p>
      <UiButton type="submit" :disabled="busy">Войти</UiButton>
    </form>

    <template v-else>
      <div :class="$style.filters">
        <button
          v-if="classFilter"
          type="button"
          :class="[$style.chip, $style.chipOn]"
          @click="clearClassFilter"
        >
          Класс: {{ classFilter }} ×
        </button>
        <UiButton variant="ghost" type="button" :disabled="loading" @click="load">
          Обновить
        </UiButton>
      </div>

      <p v-if="loading" :class="$style.muted">Загрузка…</p>
      <p v-else-if="!items.length" :class="$style.muted">Нет сообщений.</p>

      <ul v-else :class="$style.list">
        <li v-for="item in items" :key="item.id" :class="$style.card">
          <div :class="$style.cardHead">
            <NuxtLink
              v-if="item.class_slug"
              :to="`/class/${item.class_slug}`"
              :class="$style.classLink"
            >
              {{ item.class_slug }}
            </NuxtLink>
            <span v-else :class="$style.siteTag">Сайт</span>
            <span :class="$style.meta">{{ formatDate(item.created_at) }}</span>
          </div>
          <p :class="$style.text">{{ item.body }}</p>
          <div :class="$style.actions">
            <UiButton
              variant="danger"
              type="button"
              :disabled="acting === item.id"
              @click="remove(item)"
            >
              Удалить
            </UiButton>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConfirm, useSuperadmin } from '@/shared/lib'
import { UiButton } from '@/shared/ui'

useHead({ title: 'Админ — обратная связь | BDO Keep' })

type FeedbackItem = {
  id: string
  class_id: string | null
  class_slug: string | null
  body: string
  created_at: string
}

const route = useRoute()
const router = useRouter()
const { isSuperadmin } = useSuperadmin()
const { alert, confirm } = useConfirm()

const authed = ref(false)
const password = ref('')
const loginError = ref('')
const busy = ref(false)
const loading = ref(false)
const items = ref<FeedbackItem[]>([])
const acting = ref<string | null>(null)
const classFilter = ref(
  typeof route.query.class === 'string' ? route.query.class.trim().toLowerCase() : '',
)

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function syncQuery() {
  const query: Record<string, string> = {}
  if (classFilter.value) query.class = classFilter.value
  void router.replace({ query })
}

function clearClassFilter() {
  classFilter.value = ''
  syncQuery()
  if (authed.value) void load()
}

async function checkMe() {
  try {
    const res = await $fetch<{ ok: boolean }>('/api/admin/me')
    authed.value = Boolean(res.ok)
    isSuperadmin.value = authed.value
  } catch {
    authed.value = false
  }
}

async function login() {
  loginError.value = ''
  busy.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    authed.value = true
    isSuperadmin.value = true
    await load()
  } catch {
    loginError.value = 'Неверный пароль'
  } finally {
    busy.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (classFilter.value && /^[a-z0-9-]+$/.test(classFilter.value)) {
      query.class_slug = classFilter.value
    }
    const res = await $fetch<{ items: FeedbackItem[] }>('/api/admin/feedback', { query })
    items.value = res.items ?? []
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'statusCode' in e
        ? Number((e as { statusCode?: number }).statusCode)
        : 0
    if (code === 401) {
      authed.value = false
      isSuperadmin.value = false
    }
    items.value = []
  } finally {
    loading.value = false
  }
}

async function remove(item: FeedbackItem) {
  const scope = item.class_slug ? `по классу ${item.class_slug}` : 'с главной'
  const ok = await confirm({
    title: 'Удалить сообщение?',
    message: `Сообщение ${scope} будет удалено.`,
    confirmLabel: 'Удалить',
  })
  if (!ok) return

  acting.value = item.id
  try {
    await $fetch(`/api/admin/feedback/${item.id}`, { method: 'DELETE' })
    items.value = items.value.filter((i) => i.id !== item.id)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({
      title: 'Ошибка',
      message: msg || 'Не удалось удалить',
    })
  } finally {
    acting.value = null
  }
}

onMounted(async () => {
  await checkMe()
  if (authed.value) await load()
})
</script>

<style module>
.page {
  width: min(calc(100% - 2rem), 960px);
  margin-inline: auto;
  padding: 2rem 0 4rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.h1 {
  margin: 0;
  font-size: 1.6rem;
}

.link {
  color: var(--color-gold);
  font-size: 0.9rem;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.login {
  display: grid;
  gap: 0.85rem;
  max-width: 22rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1.25rem;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.input {
  box-sizing: border-box;
  min-height: 2rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1;
  padding: 0 0.65rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.chip {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.75rem;
}

.chipOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.list {
  margin: 0;
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem;
}

.cardHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.65rem;
}

.classLink {
  color: var(--color-gold);
  font-weight: 600;
  text-decoration: none;
}

.classLink:hover {
  text-decoration: underline;
}

.siteTag {
  color: var(--color-gold-soft);
  font-weight: 600;
}

.meta {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font: inherit;
  color: var(--color-ink);
  line-height: 1.45;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.85rem;
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
</style>
