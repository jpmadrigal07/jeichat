# Next.js frontend (apps/web). Build context must be the monorepo root.
# next build runs on Node — Bun hits a CJS wrapper bug with Next 16 Turbopack.

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
# Stage 2: Build (keep node_modules from base — do not recopy a partial tree)
# ================================
FROM base AS builder

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Baked into the client bundle at build time — not read from runtime env.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_CREDENTIALS=true
ARG NEXT_PUBLIC_FILES_URL=
ARG NEXT_PUBLIC_WORKSPACE_CREATOR_EMAILS=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_CREDENTIALS=${NEXT_PUBLIC_API_CREDENTIALS}
ENV NEXT_PUBLIC_FILES_URL=${NEXT_PUBLIC_FILES_URL}
ENV NEXT_PUBLIC_WORKSPACE_CREATOR_EMAILS=${NEXT_PUBLIC_WORKSPACE_CREATOR_EMAILS}

WORKDIR /app/apps/web
RUN node -e "require('child_process').execFileSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { stdio: 'inherit' })"

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
