<script setup lang="ts">
import { computed, ref } from 'vue'
import { UiButton } from '@/shared/ui'
import { submitFeedback } from '../api/submitFeedback'

const MAX_BODY = 2000

const props = defineProps<{
  classSlug?: string
}>()

const body = ref('')
const honeypot = ref('')
const submitting = ref(false)
const formError = ref('')
const sent = ref(false)

const remaining = computed(() => MAX_BODY - body.value.length)

const placeholder = computed(() =>
  props.classSlug
    ? 'Ошибка в гайде, идея, вопрос…'
    : 'Идея по сайту, ошибка, вопрос…',
)

async function onSubmit() {
  formError.value = ''
  const text = body.value.trim()
  if (!text) {
    formError.value = 'Введите сообщение'
    return
  }
  if (text.length > MAX_BODY) {
    formError.value = `Сообщение слишком длинное (макс. ${MAX_BODY})`
    return
  }

  submitting.value = true
  try {
    await submitFeedback({
      classSlug: props.classSlug || undefined,
      body: text,
      website: honeypot.value || undefined,
    })
    body.value = ''
    honeypot.value = ''
    sent.value = true
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

function writeAgain() {
  sent.value = false
  formError.value = ''
}
</script>

<template>
  <div :class="$style.root">
    <template v-if="sent">
      <p :class="$style.success">
        Сообщение отправлено. Админ увидит его в очереди обратной связи.
      </p>
      <UiButton variant="ghost" type="button" @click="writeAgain">
        Написать ещё
      </UiButton>
    </template>

    <form v-else :class="$style.form" @submit.prevent="onSubmit">
      <input
        v-model="honeypot"
        type="text"
        name="website"
        autocomplete="off"
        tabindex="-1"
        :class="$style.honey"
        aria-hidden="true"
      >

      <label :class="$style.label">
        <span>Сообщение админу (анонимно)</span>
        <textarea
          v-model="body"
          :class="$style.textarea"
          rows="8"
          :maxlength="MAX_BODY"
          :placeholder="placeholder"
          required
        />
      </label>

      <div :class="$style.row">
        <span :class="$style.hint">Осталось {{ remaining }} символов</span>
        <UiButton type="submit" :disabled="submitting">
          {{ submitting ? 'Отправка…' : 'Отправить' }}
        </UiButton>
      </div>

      <p v-if="formError" :class="$style.error">{{ formError }}</p>
    </form>
  </div>
</template>

<style module>
.root {
  width: 100%;
}

.form {
  position: relative;
  display: grid;
  gap: 0.85rem;
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
  gap: 0.45rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 14rem;
  height: 14rem;
  resize: none;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1.45;
  padding: 0.75rem 0.85rem;
}

.textarea:focus {
  outline: 1px solid var(--color-border-strong);
  outline-offset: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.hint {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.success {
  margin: 0 0 0.75rem;
  color: var(--color-ink);
  font-size: 0.95rem;
  line-height: 1.45;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
