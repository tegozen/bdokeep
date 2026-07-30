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
    <button
      type="button"
      :class="$style.secondary"
      :disabled="busy"
      @click="$emit('login')"
    >
      {{ busy ? '…' : 'Войти' }}
    </button>
    <p v-if="error" :class="$style.error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
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
