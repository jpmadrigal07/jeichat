# NestJS API (apps/api). Build context must be the monorepo root.

# ================================
# Stage 1: Install dependencies
# ================================
FROM node:24.13-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      python3 \
      make \
      g++ \
      unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.10"

ENV PATH="/root/.bun/bin:$PATH"

COPY package.json bun.lock turbo.json ./
COPY docker/bunfig.toml ./bunfig.toml
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages

RUN bun install --frozen-lockfile

# ================================
# Stage 2: Build
# ================================
FROM base AS builder

WORKDIR /app

COPY . .

RUN bun run --filter api build

# ================================
# Stage 3: Runtime
# ================================
FROM node:24.13-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.10"

ENV PATH="/root/.bun/bin:$PATH"
ENV NODE_ENV=production

COPY package.json bun.lock turbo.json ./
COPY docker/bunfig.toml ./bunfig.toml
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database ./apps/api/src/database

WORKDIR /app/apps/api

ARG PORT=3001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["sh", "-c", "bun run db:migrate && bun dist/main.js"]
