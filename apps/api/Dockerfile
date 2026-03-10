FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build --filter=api
RUN pnpm prune --prod

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 8080
CMD ["node", "dist/main.js"]
