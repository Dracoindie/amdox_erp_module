# syntax=docker/dockerfile:1
# AMX-ERP-2026 web — build from the repository root:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t amdox-erp-suite/web:0.2.0 .
# NEXT_PUBLIC_* values are baked into the client bundle and the CSP at build time.

ARG NODE_IMAGE=node:22.12-alpine3.20

# ── 1. Prune ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS pruner
WORKDIR /app
RUN npm install -g turbo@2.9.12
COPY . .
RUN turbo prune web --docker

# ── 2. Install (frozen lockfile) + build ──────────────────────────────────────
FROM ${NODE_IMAGE} AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_USE_MOCKS=false
ARG CSP_CONNECT_SRC=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_USE_MOCKS=${NEXT_PUBLIC_USE_MOCKS} \
    CSP_CONNECT_SRC=${CSP_CONNECT_SRC} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=web...

# ── 3. Runtime (standalone output) ────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
