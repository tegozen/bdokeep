<template>
  <!-- Header nav: same UiButton cell as the other header actions. -->
  <template v-if="headerNav">
    <UiButton
      v-if="isStaff"
      variant="ghost"
      size="sm"
      rounded
      color="var(--color-gold-soft)"
      icon-color="var(--color-gold-soft)"
      hover-color="var(--color-gold)"
      title="Выйти"
      aria-label="Выйти"
      data-header-auth
      @click="onLogout"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Выйти
    </UiButton>

    <template v-else>
      <UiButton
        variant="ghost"
        size="sm"
        rounded
        color="var(--color-gold-soft)"
        icon-color="var(--color-gold-soft)"
        hover-color="var(--color-gold)"
        title="Войти"
        aria-label="Войти"
        data-header-auth
        @click="openLogin = true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Войти
      </UiButton>

      <UiModal
        :open="openLogin"
        title="Вход в админку"
        aria-label="Вход администратора"
        size="sm"
        :z-index="90"
        @close="closeLogin"
      >
        <div :class="$style.modalBody">
          <LoginFields
            v-model:username="username"
            v-model:password="password"
            :busy="busy"
            :error="error"
            @login="onLogin"
          />
        </div>
      </UiModal>
    </template>
  </template>

  <div
    v-else
    :class="[$style.row, compact && $style.rowCompact]"
  >
    <div v-if="!isStaff && $slots.default" :class="$style.leading">
      <slot />
    </div>

    <div :class="[$style.trailing, isStaff && $style.trailingFull]">
      <div
        v-if="isStaff"
        :class="[$style.banner, compact && $style.compact]"
      >
        <span>{{ bannerText }}</span>
        <button type="button" :class="$style.linkish" @click="onLogout">
          Выйти
        </button>
      </div>

      <template v-else>
        <UiButton
          type="button"
          :variant="compact ? 'ghost' : 'secondary'"
          :size="compact ? 'sm' : 'md'"
          :class="!$slots.default && !compact && $style.triggerWide"
          @click="openLogin = true"
        >
          Войти как админ
        </UiButton>

        <UiModal
          :open="openLogin"
          title="Вход в админку"
          aria-label="Вход администратора"
          size="sm"
          :z-index="90"
          @close="closeLogin"
        >
          <div :class="$style.modalBody">
            <LoginFields
              v-model:username="username"
              v-model:password="password"
              :busy="busy"
              :error="error"
              @login="onLogin"
            />
          </div>
        </UiModal>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseApiError } from '@/shared/lib'
import UiButton from '@/shared/ui/UiButton.vue'
import UiModal from '@/shared/ui/UiModal.vue'
import { useSuperadmin } from '../lib/useSuperadmin'
import LoginFields from './LoginFields.vue'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    openLoginOnMount?: boolean
    /** Login / logout control for the site header nav (UiButton). */
    headerNav?: boolean
    /** Navigate here after successful login. */
    afterLoginTo?: string
  }>(),
  {
    compact: false,
    openLoginOnMount: false,
    headerNav: false,
    afterLoginTo: '',
  },
)

const { isStaff, username: sessionUser, refresh, login, logout } = useSuperadmin()
const username = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const openLogin = ref(props.openLoginOnMount)

const bannerText = computed(() => {
  const who = sessionUser.value || 'админ'
  if (props.compact) return who
  return `${who} — правка опубликуется сразу`
})

onMounted(() => {
  void refresh()
})

function closeLogin() {
  openLogin.value = false
  username.value = ''
  password.value = ''
  error.value = ''
}

async function onLogin() {
  error.value = ''
  busy.value = true
  try {
    await login({ username: username.value, password: password.value })
    username.value = ''
    password.value = ''
    openLogin.value = false
    if (props.afterLoginTo) {
      await navigateTo(props.afterLoginTo)
    }
  } catch (e) {
    error.value = parseApiError(e, 'Неверный логин или пароль')
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

.linkish {
  border: 0;
  background: transparent;
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
}

.modalBody {
  padding: 1rem;
}
</style>
