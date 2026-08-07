<template>
  <UiModal
    :open="Boolean(request)"
    role="alertdialog"
    size="sm"
    border-strong
    :z-index="100"
    :title-id="titleId"
    :labelled-by="titleId"
    :described-by="messageId"
    :title="request?.title || (isAlert ? 'Сообщение' : 'Подтверждение')"
    @close="onClose"
  >
    <div :class="$style.body">
      <p :id="messageId" :class="$style.message">{{ request?.message }}</p>
      <div :class="$style.actions">
        <UiButton
          v-if="!isAlert"
          variant="secondary"
          type="button"
          @click="settle(false)"
        >
          {{ request?.cancelLabel || 'Отмена' }}
        </UiButton>
        <UiButton type="button" @click="settle(true)">
          {{
            request?.confirmLabel || (isAlert ? 'ОК' : 'Подтвердить')
          }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { useConfirm } from '@/shared/lib'
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'

const titleId = useId()
const messageId = useId()
const { request, settle } = useConfirm()
const isAlert = computed(() => request.value?.variant === 'alert')

function onClose() {
  // Esc / backdrop: cancel for confirm, acknowledge for alert.
  settle(isAlert.value)
}
</script>

<style module>
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
