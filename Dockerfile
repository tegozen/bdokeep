# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000
ARG NUXT_PUBLIC_SUPABASE_ANON_KEY
ENV NUXT_PUBLIC_SUPABASE_URL=$NUXT_PUBLIC_SUPABASE_URL
ENV NUXT_PUBLIC_SUPABASE_ANON_KEY=$NUXT_PUBLIC_SUPABASE_ANON_KEY
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
