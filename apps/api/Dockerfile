# Multi-stage Dockerfile for @realtorai/api (NestJS).
# Builds from the monorepo root via docker-compose's `context: ..`.

FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@realtorai/api..."

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY tsconfig.base.json pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm --filter @realtorai/api prisma generate
RUN pnpm --filter @realtorai/api build

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

WORKDIR /repo/apps/api
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
