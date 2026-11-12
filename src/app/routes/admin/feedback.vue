<template>
  <div :class="$style.page">
    <div v-if="classFilter" :class="$style.filters">
      <button
        type="button"
        :class="[$style.chip, $style.chipOn]"
        @click="clearClassFilter"
      >
        Класс: {{ classFilterLabel }} ×
      </button>
    </div>

    <p v-if="loading" :class="$style.muted">Загрузка…</p>
    <p v-else-if="!items.length" :class="$style.muted">Нет сообщений.</p>

    <ul v-else :class="$style.list">
      <li v-for="item in items" :key="item.id" :class="$style.card">
        <div :class="$style.cardHead">
          <NuxtLink
            v-if="item.class_slug"
            :to="`/class/${item.class_slug}/awakening/t1`"
            :class="$style.classLink"
          >
            {{ item.class_name_ru || item.class_slug }}
          </NuxtLink>
          <span v-else :class="$style.siteTag">Сайт</span>
          <span :class="$style.meta">{{ formatDate(item.created_at) }}</span>
        </div>
        <div :class="$style.text">
          <UiMarkdownPreview :model-value="item.body" />
        </div>
        <div :class="$style.actions">
          <UiButton
            variant="danger"
            type="button"
            :disabled="acting === item.id"
            @click="remove(item)"
          >
            Удалить
          </UiButton>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useSuperadmin } from '@/features/superadmin-auth'
import { formatRuDateTime, parseApiError, useConfirm } from '@/shared/lib'
import { UiButton } from '@/shared/ui'

const UiMarkdownPreview = defineAsyncComponent(
  () => import('@/shared/ui/UiMarkdownPreview.vue'),
)

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — обратная связь | BDO Keep' })

type FeedbackItem = {
  id: string
  class_id: string | null
  class_slug: string | null
  class_name_ru?: string | null
  body: string
  created_at: string
}

const route = useRoute()
const router = useRouter()
const { isStaff, refresh, loseSession } = useSuperadmin()
const { alert, confirm } = useConfirm()

const loading = ref(false)
const items = ref<FeedbackItem[]>([])
const acting = ref<string | null>(null)
const classFilter = ref(
  typeof route.query.class === 'string' ? route.query.class.trim().toLowerCase() : '',
)

const classFilterLabel = computed(() => {
  const slug = classFilter.value
  if (!slug) return ''
  const match = items.value.find((i) => i.class_slug === slug)
  return match?.class_name_ru || slug
})

const formatDate = formatRuDateTime

function syncQuery() {
  const query: Record<string, string> = {}
  if (classFilter.value) query.class = classFilter.value
  void router.replace({ query })
}

function clearClassFilter() {
  classFilter.value = ''
  syncQuery()
  if (isStaff.value) void load()
}

async function load() {
  if (!isStaff.value) return
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (classFilter.value && /^[a-z0-9-]+$/.test(classFilter.value)) {
      query.class_slug = classFilter.value
    }
    const res = await $fetch<{ items: FeedbackItem[] }>('/api/admin/feedback', { query })
    items.value = res.items ?? []
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'statusCode' in e
        ? Number((e as { statusCode?: number }).statusCode)
        : 0
    items.value = []
    if (code === 401) {
      await loseSession()
      return
    }
    await alert({ title: 'Ошибка', message: parseApiError(e, 'Не удалось загрузить') })
  } finally {
    loading.value = false
  }
}

async function remove(item: FeedbackItem) {
  const className = item.class_name_ru || item.class_slug
  const scope = className ? `по классу ${className}` : 'с главной'
  const ok = await confirm({
    title: 'Удалить сообщение?',
    message: `Сообщение ${scope} будет удалено.`,
    confirmLabel: 'Удалить',
  })
  if (!ok) return

  acting.value = item.id
  try {
    await $fetch(`/api/admin/feedback/${item.id}`, { method: 'DELETE' })
    items.value = items.value.filter((i) => i.id !== item.id)
  } catch (e: unknown) {
    await alert({
      title: 'Ошибка',
      message: parseApiError(e, 'Не удалось удалить'),
    })
  } finally {
    acting.value = null
  }
}

watch(isStaff, (ok) => {
  if (ok) void load()
  else items.value = []
})

onMounted(async () => {
  await refresh()
  if (isStaff.value) await load()
})
</script>

<style module>
.page {
  display: grid;
  gap: 1rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.75rem;
}

.chipOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.list {
  margin: 0;
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem;
}

.cardHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.65rem;
}

.classLink {
  color: var(--color-gold);
  font-weight: 600;
  text-decoration: none;
}

.classLink:hover {
  text-decoration: underline;
}

.siteTag {
  color: var(--color-gold-soft);
  font-weight: 600;
}

.meta {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.text {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--color-ink);
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}
</style>
