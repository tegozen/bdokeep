<template>
  <footer :class="$style.footer">
    <div :class="$style.footerInner">
      <div :class="$style.footerCopy">
        <p :class="$style.disclaimer">
          Неофициальный фан-гайд гильдии, non-commercial. Не связан с Pearl Abyss / Black Desert.
          Игровые изображения (классы и каталог) © Pearl Abyss — для гильдейских справочных целей.
          This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.
        </p>
        <p :class="$style.repoLinks">
          Исходники:
          <a
            href="https://github.com/tegozen/bdokeep"
            target="_blank"
            rel="noopener noreferrer"
          >GitHub</a>
          ·
          <a
            href="https://gitlab.com/tegozen/bdokeep"
            target="_blank"
            rel="noopener noreferrer"
          >GitLab</a>
        </p>
      </div>
      <slot />
    </div>
  </footer>
</template>

<style module>
.footer {
  border-top: 1px solid var(--color-border);
  padding: 1.25rem 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.footerInner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
}

.footerCopy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.disclaimer {
  margin: 0;
}

.repoLinks {
  margin: 0;
  font-size: 0.8125rem;
}

.repoLinks a {
  color: var(--color-gold-soft);
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.repoLinks a:hover,
.repoLinks a:focus-visible {
  color: var(--color-gold);
  outline: none;
}
</style>
