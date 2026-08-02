<template>
  <UiButton
    v-if="!Comp"
    type="button"
    :disabled="loading"
    @click="activate"
  >
    {{ loading ? 'Загрузка…' : triggerLabel }}
  </UiButton>
  <component
    :is="Comp"
    v-else
    ref="formRef"
    v-bind="formProps"
    :trigger-label="triggerLabel"
  />
</template>

<script setup lang="ts">
import { nextTick, ref, shallowRef, type Component } from 'vue'
import { UiButton } from '@/shared/ui'

type Openable = { openModal: () => void }

const props = withDefaults(
  defineProps<{
    /** Dynamic import of a Propose*Form module. */
    loader: () => Promise<{ default: Component }>
    triggerLabel?: string
    /** Props forwarded to the form (except triggerLabel). */
    formProps?: Record<string, unknown>
  }>(),
  {
    triggerLabel: 'Предложить',
    formProps: () => ({}),
  },
)

const Comp = shallowRef<Component | null>(null)
const formRef = ref<Openable | null>(null)
const loading = ref(false)

async function activate() {
  if (loading.value) return
  loading.value = true
  try {
    if (!Comp.value) {
      Comp.value = (await props.loader()).default
    }
    await nextTick()
    if (!formRef.value?.openModal) await nextTick()
    formRef.value?.openModal()
  } finally {
    loading.value = false
  }
}
</script>
