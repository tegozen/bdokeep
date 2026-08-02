# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
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
