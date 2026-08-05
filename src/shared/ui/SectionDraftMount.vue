<script setup lang="ts">
import { computed } from 'vue'
import { remoteForProposalSection } from '@/shared/lib/mfRemotes'
import { mfAsyncComponent } from '@/shared/lib/loadMfRemote'

const props = defineProps<{
  section: string
  classSlug?: string
  readOnly?: boolean
  payload?: Record<string, unknown>
  draftProps?: Record<string, unknown>
}>()

const remote = computed(() => remoteForProposalSection(props.section))
const Draft = computed(() => {
  const name = remote.value
  if (!name) return null
  return mfAsyncComponent(name, './Draft')
})
</script>

<template>
  <ClientOnly>
    <component
      :is="Draft"
      v-if="Draft"
      :class-slug="classSlug"
      :section="section"
      :read-only="readOnly"
      :payload="payload"
      v-bind="draftProps || {}"
    />
    <pre v-else class="text-xs opacity-70">{{ payload }}</pre>
  </ClientOnly>
</template>
