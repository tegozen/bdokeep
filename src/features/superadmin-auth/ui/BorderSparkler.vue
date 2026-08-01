<template>
  <canvas ref="canvasEl" :class="$style.canvas" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Bleed outside the card so sparks aren't clipped. Page uses overflow-x: clip. */
const PAD_X = 36
const PAD_Y = 36

const canvasEl = ref<HTMLCanvasElement | null>(null)

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

let raf = 0
let resizeObs: ResizeObserver | null = null
let reduced = false
let boxW = 0
let boxH = 0
let canvasW = 0
let canvasH = 0
let dpr = 1
let t0 = 0
const sparks: Spark[] = []

function perimeterPoint(progress: number, width: number, height: number) {
  const perim = 2 * (width + height)
  let d = (((progress % 1) + 1) % 1) * perim
  if (d <= width) return { x: d, y: 0, tx: 1, ty: 0 }
  d -= width
  if (d <= height) return { x: width, y: d, tx: 0, ty: 1 }
  d -= height
  if (d <= width) return { x: width - d, y: height, tx: -1, ty: 0 }
  d -= width
  return { x: 0, y: height - d, tx: 0, ty: -1 }
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas?.parentElement) return
  const rect = canvas.parentElement.getBoundingClientRect()
  boxW = Math.max(1, Math.round(rect.width))
  boxH = Math.max(1, Math.round(rect.height))
  canvasW = boxW + PAD_X * 2
  canvasH = boxH + PAD_Y * 2
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(canvasW * dpr)
  canvas.height = Math.round(canvasH * dpr)
  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function spawn(x: number, y: number, tx: number, ty: number) {
  const ax = -tx
  const ay = -ty
  const px = -ty
  const py = tx
  const count = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < count; i++) {
    const along = 1.2 + Math.random() * 2.4
    const side = (Math.random() - 0.5) * 2.8
    sparks.push({
      x,
      y,
      vx: ax * along + px * side,
      vy: ay * along + py * side,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.55,
      size: 0.8 + Math.random() * 1.8,
    })
  }
}

function frame(now: number) {
  const canvas = canvasEl.value
  if (!canvas || reduced) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (!t0) t0 = now
  const progress = (((now - t0) / 1000) * 0.12) % 1
  const ember = perimeterPoint(progress, boxW, boxH)
  const ex = ember.x + PAD_X
  const ey = ember.y + PAD_Y

  ctx.clearRect(0, 0, canvasW, canvasH)

  if (Math.random() < 0.85) spawn(ex, ey, ember.tx, ember.ty)

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]!
    s.vy += 0.055
    s.vx *= 0.988
    s.vy *= 0.988
    s.x += s.vx
    s.y += s.vy
    s.life -= 1 / 60 / s.maxLife
    if (s.life <= 0) {
      sparks.splice(i, 1)
      continue
    }
    const a = Math.max(0, s.life)
    ctx.beginPath()
    ctx.fillStyle = `rgba(255, 220, 140, ${0.15 + a * 0.85})`
    ctx.shadowColor = `rgba(212, 175, 98, ${0.35 + a * 0.55})`
    ctx.shadowBlur = 6
    ctx.arc(s.x, s.y, s.size * (0.5 + a * 0.7), 0, Math.PI * 2)
    ctx.fill()
  }

  const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 10)
  g.addColorStop(0, 'rgba(255, 244, 204, 0.95)')
  g.addColorStop(0.35, 'rgba(212, 175, 98, 0.85)')
  g.addColorStop(1, 'rgba(212, 175, 98, 0)')
  ctx.shadowBlur = 0
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(ex, ey, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.fillStyle = '#fff6d5'
  ctx.shadowColor = 'rgba(212, 175, 98, 0.9)'
  ctx.shadowBlur = 12
  ctx.arc(ex, ey, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  if (sparks.length > 180) sparks.splice(0, sparks.length - 180)

  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  resize()
  resizeObs = new ResizeObserver(() => resize())
  if (canvasEl.value?.parentElement) resizeObs.observe(canvasEl.value.parentElement)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  sparks.length = 0
})
</script>

<style module>
.canvas {
  position: absolute;
  /* Bleed outside the card — ancestors must not clip; page clips overflow-x */
  inset: -36px;
  z-index: 2;
  pointer-events: none;
  display: block;
}
</style>
