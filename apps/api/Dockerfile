FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN pnpm build --filter=api

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages ./packages
EXPOSE 8080
CMD ["node", "dist/main.js"]
