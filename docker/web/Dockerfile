# Next.js frontend (apps/web). Build context must be the monorepo root.
# next build runs on Node — Bun hits a CJS wrapper bug with Next 16 Turbopack.

# ================================
# Stage 1: Install dependencies
# ================================
FROM oven/bun:1.3.10-debian AS base

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages

RUN bun install --frozen-lockfile \
    || bun install --frozen-lockfile \
    || bun install --frozen-lockfile

# ================================
# Stage 2: Build
# ================================
FROM node:24.13-bookworm-slim AS builder

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Baked into the client bundle at build time — not read from runtime env.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_CREDENTIALS=true
ARG NEXT_PUBLIC_FILES_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_CREDENTIALS=${NEXT_PUBLIC_API_CREDENTIALS}
ENV NEXT_PUBLIC_FILES_URL=${NEXT_PUBLIC_FILES_URL}

WORKDIR /app/apps/web
RUN node ../../node_modules/next/dist/bin/next build

# ================================
# Stage 3: Runtime (standalone)
# ================================
FROM node:24.13-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["node", "apps/web/server.js"]
