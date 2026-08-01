<template>
  <div :class="$style.wrap">
    <UiButton type="button" @click="open = true">
      {{ triggerLabel }}
    </UiButton>

    <UiModal
      :open="open"
      :title="title"
      :aria-label="title"
      :obscured="obscured"
      :full="full"
      :size="size"
      :border-strong="borderStrong"
      @close="requestClose"
    >
      <template v-if="$slots.headerExtra" #headerExtra>
        <slot name="headerExtra" />
      </template>

      <form
        :class="[$style.form, full && $style.formFull, formClass]"
        @submit.prevent="emit('submit')"
      >
        <input
          v-model="honeypot"
          type="text"
          name="website"
          autocomplete="off"
          tabindex="-1"
          :class="$style.honey"
          aria-hidden="true"
        >

        <div :class="$style.chrome">
          <SuperadminAuth>
            <label :class="$style.label">
              Игровой ник
              <input
                v-model="author"
                type="text"
                :class="$style.input"
                maxlength="80"
                required
                autocomplete="nickname"
                placeholder="Как вас зовут в игре"
              >
            </label>
          </SuperadminAuth>
        </div>

        <div :class="[$style.body, full && $style.bodyFull]">
          <slot />
          <p v-if="formError" :class="$style.error">{{ formError }}</p>
        </div>

        <div :class="[$style.actions, actionsClass]">
          <UiButton variant="secondary" type="button" @click="requestClose">Отмена</UiButton>
          <UiButton type="submit" :disabled="submitting">
            {{
              submitting
                ? 'Отправка…'
                : isSuperadmin
                  ? 'Опубликовать'
                  : 'Отправить'
            }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { SuperadminAuth } from '@/features/superadmin-auth'
import { UiButton, UiModal, type UiModalSize } from '@/shared/ui'

withDefaults(
  defineProps<{
    title: string
    triggerLabel?: string
    submitting: boolean
    formError: string
    obscured: boolean
    isSuperadmin: boolean
    requestClose: () => void | Promise<void>
    full?: boolean
    size?: UiModalSize
    borderStrong?: boolean
    formClass?: string
    actionsClass?: string
  }>(),
  {
    triggerLabel: 'Предложить',
    full: false,
    size: 'md',
    borderStrong: false,
    formClass: undefined,
    actionsClass: undefined,
  },
)

const emit = defineEmits<{
  submit: []
}>()

const open = defineModel<boolean>('open', { required: true })
const honeypot = defineModel<string>('honeypot', { required: true })
const author = defineModel<string>('author', { required: true })
</script>

<style module>
.wrap {
  display: inline-flex;
}

.form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}

.chrome {
  flex-shrink: 0;
  display: grid;
  gap: 0.85rem;
  padding: 1rem 1rem 0;
}

.body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.85rem 1rem 1rem;
}

.bodyFull {
  overflow: hidden;
  min-height: 0;
  padding-bottom: 0.5rem;
}

.formFull {
  overflow: hidden;
}

.formFull .actions {
  flex-shrink: 0;
  margin-top: 0;
  padding: 0.25rem 1rem 1rem;
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

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
  background: var(--color-bg-elevated);
}
</style>
