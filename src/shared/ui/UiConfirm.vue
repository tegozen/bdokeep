<template>
  <Teleport to="body">
    <div
      v-if="request"
      :class="[$style.backdrop, obscured && $style.obscured]"
      @click.self="settle(false)"
    >
      <div
        :class="$style.modal"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <header :class="$style.head">
          <h3 :id="titleId" :class="$style.title">
            {{ request.title || 'Подтверждение' }}
          </h3>
          <button type="button" :class="$style.close" aria-label="Закрыть" @click="settle(false)">
            ×
          </button>
        </header>
        <div :class="$style.body">
          <p :id="messageId" :class="$style.message">{{ request.message }}</p>
          <div :class="$style.actions">
            <UiButton variant="secondary" type="button" @click="settle(false)">
              {{ request.cancelLabel || 'Отмена' }}
            </UiButton>
            <UiButton type="button" @click="settle(true)">
              {{ request.confirmLabel || 'Подтвердить' }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirm, useModalEscape } from '@/shared/lib'
import UiButton from './UiButton.vue'

const titleId = useId()
const messageId = useId()
const { request, settle } = useConfirm()
const confirmOpen = computed(() => Boolean(request.value))

const { obscured } = useModalEscape(confirmOpen, () => settle(false))
</script>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
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

.body {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.message {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--color-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

</style>
