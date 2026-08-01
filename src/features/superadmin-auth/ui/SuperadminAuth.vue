<template>
  <div v-if="isSuperadmin" :class="[$style.banner, compact && $style.compact]">
    <span>{{ compact ? 'Суперадмин' : 'Суперадмин — правка опубликуется сразу' }}</span>
    <button type="button" :class="$style.linkish" @click="onLogout">Выйти</button>
  </div>

  <template v-else>
    <button type="button" :class="[$style.trigger, !compact && $style.triggerWide]" @click="openLogin = true">
      Войти как суперадмин
    </button>

    <Teleport to="body">
      <div
        v-if="openLogin"
        :class="[$style.backdrop, obscured && $style.obscured]"
        @click.self="closeLogin"
      >
        <div
          :class="$style.modal"
          role="dialog"
          aria-modal="true"
          aria-label="Вход суперадмина"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Войти как суперадмин</h3>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="closeLogin">
              ×
            </button>
          </header>
          <div :class="$style.modalBody">
            <LoginFields
              v-model:password="password"
              :busy="busy"
              :error="error"
              @login="onLogin"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { useModalEscape, useSuperadmin } from '@/shared/lib'
import LoginFields from './LoginFields.vue'

withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
})

const { isSuperadmin, refresh, login, logout } = useSuperadmin()
const password = ref('')
const busy = ref(false)
const error = ref('')
const openLogin = ref(false)

const { obscured } = useModalEscape(openLogin, closeLogin)

onMounted(() => {
  void refresh()
})

function closeLogin() {
  openLogin.value = false
  password.value = ''
  error.value = ''
}

async function onLogin() {
  error.value = ''
  busy.value = true
  try {
    await login(password.value)
    password.value = ''
    openLogin.value = false
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

.compact.banner {
  box-sizing: border-box;
  height: 2rem;
  font-size: 0.82rem;
  gap: 0.75rem;
  padding: 0 0.65rem;
  line-height: 1;
}

.compact .linkish {
  font-size: inherit;
  line-height: 1;
}

.trigger {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  padding: 0.35rem 0.65rem;
}

.triggerWide {
  width: 100%;
  font-size: 0.88rem;
  padding: 0.45rem 0.65rem;
  text-align: left;
}

.trigger:hover {
  border-color: var(--color-border-strong);
  color: var(--color-gold-soft);
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

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
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
  width: min(100%, 22rem);
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-elevated);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-ink);
}

.close {
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.modalBody {
  padding: 1rem;
}
</style>
