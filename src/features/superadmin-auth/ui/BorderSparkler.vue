<template>
  <div
    :class="$style.root"
    :style="{ '--spark-radius': radius }"
    aria-hidden="true"
  >
    <div :class="$style.aura" />
    <span v-for="n in 14" :key="n" :class="$style.spark" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Match the highlighted card/frame corner radius. */
    radius?: string
  }>(),
  {
    radius: '0',
  },
)
</script>

<style module>
.root {
  position: absolute;
  /* Exact same box as the card/frame — glow bleeds via box-shadow */
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

.aura {
  position: absolute;
  inset: 0;
  border-radius: var(--spark-radius, 0);
  box-shadow:
    0 0 0 1px rgba(255, 220, 140, 0.35),
    0 0 14px 2px rgba(212, 175, 98, 0.35),
    0 0 28px 6px rgba(212, 175, 98, 0.18);
  animation: aura-pulse 1.8s ease-in-out infinite;
}

.spark {
  position: absolute;
  top: 0;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 236, 180, 0.95);
  box-shadow:
    0 0 4px 1px rgba(212, 175, 98, 0.85),
    0 0 8px 2px rgba(212, 175, 98, 0.35);
  opacity: 0;
  animation: spark-fall 2.2s linear infinite;
}

/* aura is :nth-child(1); sparks follow */
.spark:nth-child(2) { left: 6%; width: 2px; height: 2px; animation-duration: 2.1s; animation-delay: 0s; --drift: -4px; }
.spark:nth-child(3) { left: 14%; width: 3px; height: 3px; animation-duration: 2.6s; animation-delay: 0.35s; --drift: 3px; }
.spark:nth-child(4) { left: 22%; width: 2px; height: 2px; animation-duration: 1.9s; animation-delay: 0.8s; --drift: -2px; }
.spark:nth-child(5) { left: 31%; width: 4px; height: 4px; animation-duration: 2.4s; animation-delay: 0.15s; --drift: 5px; }
.spark:nth-child(6) { left: 40%; width: 2px; height: 2px; animation-duration: 2.8s; animation-delay: 1.1s; --drift: -3px; }
.spark:nth-child(7) { left: 48%; width: 3px; height: 3px; animation-duration: 2.2s; animation-delay: 0.55s; --drift: 2px; }
.spark:nth-child(8) { left: 56%; width: 2px; height: 2px; animation-duration: 2.5s; animation-delay: 1.4s; --drift: -5px; }
.spark:nth-child(9) { left: 65%; width: 3px; height: 3px; animation-duration: 2s; animation-delay: 0.25s; --drift: 4px; }
.spark:nth-child(10) { left: 73%; width: 2px; height: 2px; animation-duration: 2.7s; animation-delay: 0.9s; --drift: -2px; }
.spark:nth-child(11) { left: 82%; width: 4px; height: 4px; animation-duration: 2.3s; animation-delay: 1.65s; --drift: 3px; }
.spark:nth-child(12) { left: 90%; width: 2px; height: 2px; animation-duration: 2.1s; animation-delay: 0.45s; --drift: -4px; }
.spark:nth-child(13) { left: 4%; width: 3px; height: 3px; animation-duration: 2.9s; animation-delay: 1.85s; --drift: 2px; }
.spark:nth-child(14) { left: 50%; width: 2px; height: 2px; animation-duration: 1.85s; animation-delay: 2.05s; --drift: -1px; }
.spark:nth-child(15) { left: 96%; width: 3px; height: 3px; animation-duration: 2.45s; animation-delay: 1.2s; --drift: -3px; }

@keyframes aura-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 220, 140, 0.22),
      0 0 10px 1px rgba(212, 175, 98, 0.22),
      0 0 20px 4px rgba(212, 175, 98, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 236, 180, 0.55),
      0 0 18px 4px rgba(212, 175, 98, 0.5),
      0 0 36px 10px rgba(212, 175, 98, 0.28);
  }
}

@keyframes spark-fall {
  0% {
    opacity: 0;
    top: 0;
    transform: translateX(0) scale(0.6);
  }
  12% {
    opacity: 1;
    transform: translateX(calc(var(--drift, 0px) * 0.25)) scale(1);
  }
  70% {
    opacity: 0.75;
  }
  100% {
    opacity: 0;
    top: 100%;
    transform: translateX(var(--drift, 0px)) scale(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aura {
    animation: none;
    box-shadow:
      0 0 0 1px rgba(255, 220, 140, 0.35),
      0 0 14px 2px rgba(212, 175, 98, 0.3);
  }

  .spark {
    animation: none;
    display: none;
  }
}
</style>
