FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
RUN cd apps/api && npx prisma generate
RUN pnpm build --filter=api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/constants/package.json packages/constants/
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/tokens/package.json packages/tokens/
COPY --from=builder /app/packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 8080
CMD ["node", "dist/main.js"]
