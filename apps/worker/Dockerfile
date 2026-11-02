# Stage 1: Builder
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY apps/worker/ apps/worker/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @360events/worker run build

# Stage 2: Runner
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

WORKDIR /app

USER node

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/api ./apps/api
COPY --from=builder --chown=node:node /app/apps/worker ./apps/worker

EXPOSE 3001

CMD ["node", "apps/worker/dist/index.js"]
