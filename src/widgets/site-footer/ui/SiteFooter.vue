<template>
  <footer :class="$style.footer">
    <div :class="$style.footerInner">
      <div :class="$style.disclaimer">
        <p>
          Неофициальный фан-гайд гильдии, non-commercial. Не связан с Pearl Abyss / Black Desert.
        </p>
        <p>
          Игровые изображения (классы и каталог) © Pearl Abyss — для гильдейских справочных целей.
        </p>
        <p>
          This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.
        </p>
      </div>

      <div :class="$style.aside">
        <div :class="$style.repoLinks" aria-label="Исходники">
          <span :class="$style.repoLabel">Исходники:</span>
          <a
            href="https://github.com/tegozen/bdokeep"
            target="_blank"
            rel="noopener noreferrer"
            :class="$style.repoLink"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              :class="$style.repoIcon"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            <span>GitHub</span>
          </a>
          <span :class="$style.repoDivider" aria-hidden="true" />
          <a
            href="https://gitlab.com/tegozen/bdokeep"
            target="_blank"
            rel="noopener noreferrer"
            :class="$style.repoLink"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              :class="$style.repoIcon"
            >
              <path
                d="M23.955 13.587l-1.342-4.135-2.655-8.172a.455.455 0 0 0-.864 0L16.439 9.45H7.561L4.906 1.28a.455.455 0 0 0-.864 0L1.387 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.92.92 0 0 0 .331-1.024"
              />
            </svg>
            <span>GitLab</span>
          </a>
        </div>
        <slot />
      </div>
    </div>
  </footer>
</template>

<style module>
.footer {
  padding: 1.25rem var(--page-gutter) 1.75rem;
}

.footerInner {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem 2rem;
  width: var(--page-width);
  margin-inline: auto;
  padding: 1.15rem 1.35rem;
  border: 0;
  border-radius: 0.75rem;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-gold) 7%, var(--color-bg-deep)) 0%,
      var(--color-bg-deep) 42%,
      #050608 100%
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-gold) 18%, transparent),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35);
}

/* Same gradient rim as home filters. */
.footerInner::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(196, 148, 88, 0.72) 0%,
    rgba(140, 100, 55, 0.42) 18%,
    rgba(70, 50, 30, 0.28) 42%,
    rgba(30, 22, 14, 0.35) 68%,
    rgba(18, 14, 10, 0.55) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.disclaimer {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--color-gold-soft) 72%, var(--color-muted));
}

.disclaimer p {
  margin: 0;
}

.aside {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.85rem;
}

.repoLinks {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.875rem;
  color: var(--color-gold);
}

.repoLabel {
  color: color-mix(in srgb, var(--color-gold-soft) 70%, var(--color-muted));
  font-size: 0.8125rem;
}

.repoLink {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-gold);
  text-decoration: underline;
  text-underline-offset: 0.14em;
  text-decoration-thickness: 1px;
}

.repoLink:hover,
.repoLink:focus-visible {
  color: var(--color-gold-soft);
  outline: none;
}

.repoIcon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
}

.repoDivider {
  width: 1px;
  height: 1.35rem;
  background: color-mix(in srgb, var(--color-border-strong) 70%, transparent);
}

@media (max-width: 720px) {
  .footerInner {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem 1.1rem;
  }

  .aside {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .repoLinks {
    flex-wrap: wrap;
    row-gap: 0.45rem;
  }
}
</style>
