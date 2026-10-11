FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm --filter saathi-rides --filter @saathi/api... --filter @saathi/web... install --frozen-lockfile \
    && pnpm build

# Install API runtime dependencies from the same lockfile without web/mobile tooling.
FROM node:24-bookworm-slim AS api-dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts ./packages/contracts
RUN pnpm --filter @saathi/api... install --prod --frozen-lockfile --config.node-linker=isolated

FROM node:24-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-dependencies /app/package.json ./package.json
COPY --from=api-dependencies /app/node_modules ./node_modules
COPY --from=api-dependencies /app/apps/api ./apps/api
COPY --from=api-dependencies /app/packages/contracts ./packages/contracts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]

FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
