# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
# Cap Nuxt/Vite/esbuild so a rebuild doesn't pin every VPS core (override via compose build.args).
# Tuned for small VPS (~4 CPU / 6G, ~1 core + ~4G already in use idle).
ARG BUILD_CPU_COUNT=1
ARG BUILD_NODE_MAX_OLD_SPACE=768
ENV GOMAXPROCS=${BUILD_CPU_COUNT}
ENV UV_THREADPOOL_SIZE=${BUILD_CPU_COUNT}
ENV NODE_OPTIONS=--max-old-space-size=${BUILD_NODE_MAX_OLD_SPACE}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Fail fast if catalog icons were not deployed with the repo (CSP forbids CDN hotlink).
RUN test -d public/codex/items \
  && test "$(find public/codex/items -type f | wc -l)" -ge 100 \
  || (echo "ERROR: public/codex/items is missing or empty — copy the full repo including public/codex before build" >&2 && exit 1)
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN addgroup -S nuxt && adduser -S nuxt -G nuxt
COPY --from=build --chown=nuxt:nuxt /app/.output ./.output
# Nitro serves static from .output/public (Nuxt may miss root public/ with custom srcDir)
COPY --from=build --chown=nuxt:nuxt /app/public/. ./.output/public/
USER nuxt
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
