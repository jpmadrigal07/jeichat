# NestJS API (apps/api). Build context must be the monorepo root.

# ================================
# Stage 1: Install dependencies
# ================================
FROM oven/bun:1.3.10-debian AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

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
FROM oven/bun:1.3.10-debian AS builder

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .

RUN bun run --filter api build

# ================================
# Stage 3: Runtime
# ================================
FROM oven/bun:1.3.10-debian AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database ./apps/api/src/database

WORKDIR /app/apps/api

ARG PORT=3001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["sh", "-c", "bun run db:migrate && bun dist/main.js"]
