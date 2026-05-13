FROM node:22-alpine AS pruner
RUN apk update && apk add --no-cache openssl
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

FROM node:22-alpine AS installer
RUN apk update && apk add --no-cache openssl
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api run db:generate
RUN pnpm turbo run build --filter=api...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/api/package.json ./apps/api/
COPY --from=installer /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
