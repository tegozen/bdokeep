<template>
  <UiModal
    :open="open"
    title="Как настроить макрос чата"
    aria-label="Как настроить макрос чата"
    size="lg"
    @close="emit('close')"
  >
    <div :class="$style.body">
      <div :class="$style.copyZone">
        <code :class="$style.macro">{{ MACRO }}</code>
        <UiButton
          type="button"
          size="sm"
          :variant="copied ? 'secondary' : 'primary'"
          @click="copyMacro"
        >
          {{ copied ? 'Скопировано' : 'Копировать' }}
        </UiButton>
      </div>

      <div :class="$style.columns">
        <div :class="$style.guide">
          <section :class="$style.section">
            <h4 :class="$style.sectionTitle">Создание</h4>
            <ol :class="$style.steps">
              <li>Активировать чат <kbd :class="$style.kbd">Enter</kbd></li>
              <li>
                Справа от поля ввода нажать кнопку <kbd :class="$style.kbd">M</kbd>
                <img
                  :src="IMG_BUTTON_M"
                  alt="Поле чата BDO: справа от ввода кнопка M, на неё указывает стрелка"
                  width="590"
                  height="35"
                  loading="lazy"
                  decoding="async"
                  :class="[$style.shot, $style.shotInStep]"
                >
              </li>
              <li>В открывшемся окне выбрать чат и вставить макрос в поле ввода</li>
              <li>Закрыть окно кнопкой <kbd :class="$style.kbd">Esc</kbd></li>
            </ol>
          </section>

          <section :class="$style.section">
            <h4 :class="$style.sectionTitle">Использование</h4>
            <p :class="$style.usage">
              <kbd :class="$style.kbd">Alt</kbd>
              +
              <kbd :class="$style.kbd">Shift</kbd>
              +
              <kbd :class="$style.kbd">1</kbd>
            </p>
          </section>
        </div>

        <img
          :src="IMG_SETTINGS"
          alt="Окно настроек макросов чата в BDO: слоты Alt+Shift+1…0, выбор канала и поле ввода"
          width="357"
          height="349"
          loading="lazy"
          decoding="async"
          :class="$style.shot"
        >
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiModal } from '@/shared/ui'

/** Same-origin public assets on the host (not bundled into the remote). */
const IMG_BUTTON_M = '/guides/chat-macro-button-m.png'
const IMG_SETTINGS = '/guides/chat-macro-settings.png'

const MACRO = 'HWWHWWHWWHWWHWWHWWHWWHWWHWWHWWHWWHWWHWWHW'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyMacro() {
  try {
    await navigator.clipboard.writeText(MACRO)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = MACRO
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1800)
}
</script>

<style module>
.body {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  overflow: auto;
  padding: 1rem 1.1rem 1.25rem;
}

.copyZone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 0.75rem;
  border: 1px solid var(--color-border-strong);
  background: color-mix(in srgb, var(--color-gold-dim) 55%, var(--color-bg-deep));
  padding: 0.75rem 0.85rem;
}

.macro {
  flex: 1 1 12rem;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-gold);
  user-select: all;
}

.columns {
  display: grid;
  gap: 1.15rem 1.35rem;
  align-items: start;
}

@media (min-width: 700px) {
  .columns {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 18rem);
  }
}

.guide {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  min-width: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sectionTitle {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-gold-soft);
}

.steps {
  margin: 0;
  padding-left: 1.4rem;
  list-style-type: decimal;
  list-style-position: outside;
  color: var(--color-ink);
  font-size: 0.9rem;
  line-height: 1.55;
}

.steps li {
  display: list-item;
}

.steps li + li {
  margin-top: 0.35rem;
}

.usage {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  color: var(--color-ink);
}

.kbd {
  display: inline-block;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-deep);
  color: var(--color-gold);
  font: inherit;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0.2rem 0.4rem;
}

.shot {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--color-border);
  background: #0a0b10;
}

.shotInStep {
  margin-top: 0.55rem;
}
</style>
