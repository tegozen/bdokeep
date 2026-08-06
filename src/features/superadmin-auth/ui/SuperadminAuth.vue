<template>
  <div :class="[$style.row, compact && $style.rowCompact]">
    <div v-if="!isSuperadmin && $slots.default" :class="$style.leading">
      <slot />
    </div>

    <div :class="[$style.trailing, isSuperadmin && $style.trailingFull]">
      <div v-if="isSuperadmin" :class="[$style.banner, compact && $style.compact]">
        <span>{{ compact ? 'Суперадмин' : 'Суперадмин — правка опубликуется сразу' }}</span>
        <button type="button" :class="$style.linkish" @click="onLogout">Выйти</button>
      </div>

      <template v-else>
        <button
          v-if="iconTrigger"
          type="button"
          :class="$style.iconTrigger"
          aria-label="Войти как суперадмин"
          title="Войти как суперадмин"
          @click="openLogin = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
        <UiButton
          v-else
          type="button"
          :variant="compact ? 'ghost' : 'secondary'"
          :size="compact ? 'sm' : 'md'"
          :class="!$slots.default && !compact && $style.triggerWide"
          @click="openLogin = true"
        >
          Войти как суперадмин
        </UiButton>

        <Teleport v-if="openLogin" to="body">
          <div
            :class="[$style.backdrop, obscured && $style.obscured]"
            @pointerdown="onLoginBackdropPointerDown"
            @click="onLoginBackdropClick"
          >
            <div
              :class="$style.modal"
              role="dialog"
              aria-modal="true"
              aria-label="Вход суперадмина"
              @pointerdown.stop
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useModalEscape, useSuperadmin } from '@/shared/lib'
import UiButton from '@/shared/ui/UiButton.vue'
import LoginFields from './LoginFields.vue'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    openLoginOnMount?: boolean
    /** Muted lock icon instead of labeled button (footer entry). */
    iconTrigger?: boolean
  }>(),
  {
    compact: false,
    openLoginOnMount: false,
    iconTrigger: false,
  },
)

const { isSuperadmin, refresh, login, logout } = useSuperadmin()
const password = ref('')
const busy = ref(false)
const error = ref('')
const openLogin = ref(props.openLoginOnMount)

const { obscured } = useModalEscape(openLogin, closeLogin)

/** Close only if press started on backdrop — not drag-from-dialog release. */
const loginBackdropPress = ref(false)

function onLoginBackdropPointerDown(e: PointerEvent) {
  loginBackdropPress.value = e.target === e.currentTarget
}

function onLoginBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget && loginBackdropPress.value) {
    closeLogin()
  }
  loginBackdropPress.value = false
}

onMounted(() => {
  void refresh()
})

function closeLogin() {
  openLogin.value = false
  password.value = ''
  error.value = ''
  loginBackdropPress.value = false
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
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.65rem 0.85rem;
}

.rowCompact {
  align-items: center;
  gap: 0;
}

.leading {
  flex: 1 1 12rem;
  min-width: 0;
}

.trailing {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.trailingFull {
  flex: 1 1 100%;
}

.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  border: 1px solid var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold-soft);
  font-size: 0.88rem;
  padding: 0.5rem 0.65rem;
}

.compact.banner {
  box-sizing: border-box;
  height: 2rem;
  width: auto;
  font-size: 0.82rem;
  gap: 0.75rem;
  padding: 0 0.65rem;
  line-height: 1;
}

.compact .linkish {
  font-size: inherit;
  line-height: 1;
}

.triggerWide {
  width: 100%;
}

.iconTrigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 140ms ease;
}

.iconTrigger:hover,
.iconTrigger:focus-visible {
  opacity: 0.85;
  color: var(--color-gold-soft);
  outline: none;
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
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
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

.modalBody {
  padding: 1rem;
}
</style>
