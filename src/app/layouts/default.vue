<template>
  <div :class="$style.root">
    <header :class="$style.header">
      <div :class="['mx-auto flex w-[min(100%-2rem,1920px)] flex-wrap items-center gap-x-4 gap-y-2 py-4', $style.headerInner]">
        <div :class="$style.left">
          <NuxtLink to="/" :class="$style.brand">
            <span :class="$style.brandMark">BDO</span>
            <span :class="$style.brandName">Keep</span>
          </NuxtLink>
          <a
            v-if="headerClass"
            href="#summary"
            :class="$style.classMeta"
            :aria-label="`${headerClass.name_ru} — суть`"
          >
            <ClassIcon
              :slug="headerClass.slug"
              :icon-url="headerClass.icon_url"
              :label="headerClass.name_ru"
              size="sm"
            />
            <h1 :class="$style.className">{{ headerClass.name_ru }}</h1>
          </a>
          <nav
            v-if="headerToc?.length"
            :class="$style.toc"
            aria-label="Разделы гайда"
          >
            <a v-for="item in headerToc" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
          </nav>
        </div>
        <div :class="$style.auth">
          <SuperadminAuth compact />
        </div>
      </div>
    </header>

    <main :class="$style.main">
      <slot />
    </main>

    <footer :class="$style.footer">
      <div class="mx-auto w-[min(100%-2rem,1920px)]">
        <p :class="$style.disclaimer">
          Неофициальный фан-гайд гильдии. Не связан с Pearl Abyss / Black Desert.
          Портреты и иконки классов © Pearl Abyss — используются для гильдейских справочных целей.
        </p>
      </div>
    </footer>

    <UiConfirm />
  </div>
</template>

<script setup lang="ts">
import { ClassIcon } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import { useHeaderClass, useHeaderToc } from '@/shared/lib'
import { UiConfirm } from '@/shared/ui'

const headerClass = useHeaderClass()
const headerToc = useHeaderToc()
</script>

<style module>
.root {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(10, 11, 16, 0.95), rgba(10, 11, 16, 0.7));
}

.headerInner {
  justify-content: space-between;
}

.left {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.25rem;
  min-width: 0;
  flex: 1;
}

.toc {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.9rem;
  row-gap: 0.35rem;
  font-size: 0.9rem;
}

.toc a {
  color: var(--color-gold-soft);
  white-space: nowrap;
}

.toc a:hover {
  color: var(--color-gold);
}

.auth {
  margin-left: auto;
  flex-shrink: 0;
}

.brand {
  display: inline-flex;
  align-items: baseline;
  gap: 0.375rem;
  color: var(--color-ink);
  text-decoration: none;
}

.brand:hover {
  color: var(--color-ink);
}

.brandMark {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: var(--color-gold);
}

.brandName {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.05em;
}

.classMeta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: inherit;
  text-decoration: none;
}

.classMeta:hover .className {
  color: var(--color-gold-soft);
}

.className {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-gold);
}

.main {
  flex: 1;
  padding: 2rem 0 3rem;
}

.footer {
  border-top: 1px solid var(--color-border);
  padding: 1.25rem 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.disclaimer {
  margin: 0;
}
</style>
