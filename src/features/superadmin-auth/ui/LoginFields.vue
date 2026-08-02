<template>
  <div :class="$style.login">
    <label :class="$style.label">
      Пароль
      <input
        :value="password"
        type="password"
        :class="$style.input"
        autocomplete="current-password"
        @input="onInput"
        @keydown.enter.prevent="$emit('login')"
      >
    </label>
    <UiButton type="button" :disabled="busy" @click="$emit('login')">
      {{ busy ? '…' : 'Войти' }}
    </UiButton>
    <p v-if="error" :class="$style.error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { UiButton } from '@/shared/ui'

defineProps<{
  password: string
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:password': [value: string]
  login: []
}>()

function onInput(e: Event) {
  emit('update:password', (e.target as HTMLInputElement).value)
}
</script>

<style module>
.login {
  display: grid;
  gap: 0.5rem;
}

.label {
  display: grid;
  gap: 0.35rem;
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
  line-height: 1;
  padding: 0 0.65rem;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
