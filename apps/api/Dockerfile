# syntax=docker/dockerfile:1
# AMX-ERP-2026 API — build from the repository root:
#   docker build -f apps/api/Dockerfile -t amdox-erp-suite/api:0.2.0 .

ARG NODE_IMAGE=node:22.12-alpine3.20

# ── 1. Prune the monorepo down to the api workspace ───────────────────────────
FROM ${NODE_IMAGE} AS pruner
WORKDIR /app
RUN npm install -g turbo@2.9.12
COPY . .
RUN turbo prune api --docker

# ── 2. Install (frozen lockfile), generate Prisma client, build ───────────────
FROM ${NODE_IMAGE} AS builder
RUN apk add --no-cache openssl && npm install -g pnpm@9.15.9
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api run db:generate && pnpm turbo run build --filter=api...

# ── 3. Runtime ────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app
ENV NODE_ENV=production

# Non-root user
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/packages ./packages
COPY --from=builder --chown=app:app /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=app:app /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=app:app /app/apps/api/package.json ./apps/api/package.json

USER app
WORKDIR /app/apps/api
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini reaps zombies and forwards SIGTERM so graceful shutdown runs.
# Migrations are applied by the orchestrator (compose service command / k8s init container).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
