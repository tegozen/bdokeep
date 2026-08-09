<template>
  <div :class="$style.page">
    <p v-if="!isSuperadmin" :class="$style.error">
      Раздел только для суперадмина.
    </p>

    <template v-else>
      <section :class="$style.create">
        <h2 :class="$style.h2">Создать админа</h2>
        <form :class="$style.form" @submit.prevent="createUser">
          <label :class="$style.label">
            Логин
            <input
              v-model="newUsername"
              type="text"
              :class="$style.input"
              required
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            >
          </label>
          <label :class="$style.label">
            Пароль
            <input
              v-model="newPassword"
              type="password"
              :class="$style.input"
              required
              autocomplete="new-password"
            >
          </label>
          <UiButton type="submit" :disabled="creating">Создать</UiButton>
        </form>
        <p v-if="createError" :class="$style.error">{{ createError }}</p>
      </section>

      <p v-if="loading" :class="$style.muted">Загрузка…</p>
      <p v-else-if="!items.length" :class="$style.muted">Нет пользователей.</p>

      <ul v-else :class="$style.list">
        <li v-for="item in items" :key="item.id" :class="$style.card">
          <div :class="$style.cardHead">
            <strong>{{ item.username }}</strong>
            <span :class="$style.role">{{ item.role === 'superadmin' ? 'суперадмин' : 'админ' }}</span>
            <span v-if="item.disabled" :class="$style.disabled">отключён</span>
          </div>
          <div :class="$style.actions">
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="acting === item.id"
              @click="resetPassword(item)"
            >
              Сменить пароль
            </UiButton>
            <template v-if="item.role === 'admin'">
              <UiButton
                v-if="!item.disabled"
                type="button"
                variant="ghost"
                size="sm"
                :disabled="acting === item.id"
                @click="setDisabled(item, true)"
              >
                Отключить
              </UiButton>
              <UiButton
                v-else
                type="button"
                variant="ghost"
                size="sm"
                :disabled="acting === item.id"
                @click="setDisabled(item, false)"
              >
                Включить
              </UiButton>
              <UiButton
                type="button"
                variant="danger"
                size="sm"
                :disabled="acting === item.id"
                @click="remove(item)"
              >
                Удалить
              </UiButton>
            </template>
          </div>
        </li>
      </ul>
    </template>

    <UiModal
      :open="!!passwordTarget"
      :title="passwordTarget ? `Пароль · ${passwordTarget.username}` : 'Сменить пароль'"
      aria-label="Сменить пароль"
      size="sm"
      @close="closePasswordModal"
    >
      <form :class="$style.pwForm" @submit.prevent="submitPassword">
        <label :class="$style.label">
          Новый пароль
          <input
            v-model="passwordValue"
            type="password"
            :class="$style.input"
            required
            minlength="10"
            autocomplete="new-password"
          >
        </label>
        <p :class="$style.hint">Минимум 10 символов</p>
        <p v-if="passwordError" :class="$style.error">{{ passwordError }}</p>
        <div :class="$style.pwActions">
          <UiButton type="submit" :disabled="acting === passwordTarget?.id">
            {{ acting === passwordTarget?.id ? '…' : 'Сохранить' }}
          </UiButton>
          <UiButton
            type="button"
            variant="ghost"
            :disabled="acting === passwordTarget?.id"
            @click="closePasswordModal"
          >
            Отмена
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSuperadmin } from '@/features/superadmin-auth'
import { useConfirm } from '@/shared/lib'
import { UiButton, UiModal } from '@/shared/ui'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — пользователи | BDO Keep' })

type AdminUserItem = {
  id: string
  username: string
  role: 'superadmin' | 'admin'
  disabled: boolean
  created_at: string
  updated_at: string
}

const { isSuperadmin, refresh, loseSession } = useSuperadmin()
const { alert, confirm } = useConfirm()

const loading = ref(false)
const creating = ref(false)
const createError = ref('')
const newUsername = ref('')
const newPassword = ref('')
const items = ref<AdminUserItem[]>([])
const acting = ref<string | null>(null)

const passwordTarget = ref<AdminUserItem | null>(null)
const passwordValue = ref('')
const passwordError = ref('')

async function load() {
  if (!isSuperadmin.value) return
  loading.value = true
  try {
    const res = await $fetch<{ items: AdminUserItem[] }>('/api/admin/users')
    items.value = res.items ?? []
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'statusCode' in e
        ? Number((e as { statusCode?: number }).statusCode)
        : 0
    if (code === 401) {
      await loseSession()
    }
    items.value = []
  } finally {
    loading.value = false
  }
}

async function createUser() {
  createError.value = ''
  creating.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: { username: newUsername.value, password: newPassword.value },
    })
    newUsername.value = ''
    newPassword.value = ''
    await load()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    createError.value = msg || 'Не удалось создать'
  } finally {
    creating.value = false
  }
}

function resetPassword(item: AdminUserItem) {
  passwordTarget.value = item
  passwordValue.value = ''
  passwordError.value = ''
}

function closePasswordModal() {
  if (acting.value && acting.value === passwordTarget.value?.id) return
  passwordTarget.value = null
  passwordValue.value = ''
  passwordError.value = ''
}

async function submitPassword() {
  const item = passwordTarget.value
  if (!item) return
  passwordError.value = ''
  if (passwordValue.value.length < 10) {
    passwordError.value = 'Пароль слишком короткий (минимум 10)'
    return
  }
  acting.value = item.id
  try {
    await $fetch(`/api/admin/users/${item.id}`, {
      method: 'PATCH',
      body: { password: passwordValue.value },
    })
    passwordTarget.value = null
    passwordValue.value = ''
    await alert({ title: 'Готово', message: 'Пароль обновлён' })
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    passwordError.value = msg || 'Не удалось сменить пароль'
  } finally {
    acting.value = null
  }
}

async function setDisabled(item: AdminUserItem, disabled: boolean) {
  const ok = await confirm({
    title: disabled ? 'Отключить' : 'Включить',
    message: disabled
      ? `Отключить ${item.username}?`
      : `Снова включить ${item.username}?`,
    confirmLabel: disabled ? 'Отключить' : 'Включить',
    cancelLabel: 'Отмена',
  })
  if (!ok) return
  acting.value = item.id
  try {
    await $fetch(`/api/admin/users/${item.id}`, {
      method: 'PATCH',
      body: { disabled },
    })
    await load()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({ title: 'Ошибка', message: msg || 'Не удалось обновить' })
  } finally {
    acting.value = null
  }
}

async function remove(item: AdminUserItem) {
  const ok = await confirm({
    title: 'Удалить',
    message: `Удалить пользователя ${item.username}?`,
    confirmLabel: 'Удалить',
    cancelLabel: 'Отмена',
  })
  if (!ok) return
  acting.value = item.id
  try {
    await $fetch(`/api/admin/users/${item.id}`, { method: 'DELETE' })
    await load()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({ title: 'Ошибка', message: msg || 'Не удалось удалить' })
  } finally {
    acting.value = null
  }
}

watch(isSuperadmin, (ok) => {
  if (ok) void load()
  else items.value = []
})

onMounted(async () => {
  await refresh()
  if (isSuperadmin.value) await load()
})
</script>

<style module>
.page {
  display: grid;
  gap: 1rem;
}

.h2 {
  margin: 0 0 0.65rem;
  font-size: 1.05rem;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

.muted {
  margin: 0;
  color: var(--color-muted);
}

.create {
  border: 1px solid var(--color-border);
  padding: 0.85rem;
}

.form {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .form {
    grid-template-columns: 1fr 1fr auto;
    align-items: end;
  }
}

.label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.input {
  box-sizing: border-box;
  min-height: 2rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0 0.65rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.card {
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  display: grid;
  gap: 0.55rem;
}

.cardHead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.role {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.disabled {
  font-size: 0.82rem;
  color: var(--color-danger);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pwForm {
  display: grid;
  gap: 0.65rem;
}

.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-muted);
}

.pwActions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
