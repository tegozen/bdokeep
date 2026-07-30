<template>
  <div v-if="isSuperadmin" :class="[$style.banner, compact && $style.compact]">
    <span>Суперадмин — правка опубликуется сразу</span>
    <button type="button" :class="$style.linkish" @click="onLogout">Выйти</button>
  </div>
  <details v-else :class="[$style.box, compact && $style.compact]">
    <summary>Войти как суперадмин</summary>
    <div :class="$style.login">
      <label :class="$style.label">
        Пароль
        <input
          v-model="password"
          type="password"
          :class="$style.input"
          autocomplete="current-password"
          @keydown.enter.prevent="onLogin"
        >
      </label>
      <button
        type="button"
        :class="$style.secondary"
        :disabled="busy"
        @click="onLogin"
      >
        {{ busy ? '…' : 'Войти' }}
      </button>
      <p v-if="error" :class="$style.error">{{ error }}</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useSuperadmin } from '@/shared/lib'

withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
})

const { isSuperadmin, refresh, login, logout } = useSuperadmin()
const password = ref('')
const busy = ref(false)
const error = ref('')

onMounted(() => {
  void refresh()
})

async function onLogin() {
  error.value = ''
  busy.value = true
  try {
    await login(password.value)
    password.value = ''
  } catch {
    error.value = 'Неверный пароль'
  } finally {
    busy.value = false
  }
}

async function onLogout() {
  await logout()
}
</script>

<style module>
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold-soft);
  font-size: 0.88rem;
  padding: 0.5rem 0.65rem;
}

.box {
  border: 1px solid var(--color-border);
  background: rgba(10, 11, 16, 0.96);
  font-size: 0.88rem;
  color: var(--color-muted);
  padding: 0.35rem 0.65rem;
}

.box summary {
  cursor: pointer;
  list-style: none;
}

.box summary::-webkit-details-marker {
  display: none;
}

.login {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.65rem;
  padding-bottom: 0.35rem;
}

.compact.banner,
.compact.box {
  font-size: 0.82rem;
  max-width: 18rem;
}

.compact .login {
  margin-top: 0.5rem;
}

.linkish {
  border: 0;
  background: transparent;
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
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

.secondary {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  padding: 0.45rem 0.9rem;
}

.secondary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
