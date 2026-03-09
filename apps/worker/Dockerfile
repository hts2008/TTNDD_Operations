FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/constants/package.json packages/constants/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build --filter=worker
RUN pnpm prune --prod

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./
EXPOSE 3002
CMD ["node", "dist/main.js"]
