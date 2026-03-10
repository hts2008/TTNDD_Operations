FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./

# Copy all workspace package.json files
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/

# Install all deps (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client + build API
RUN cd apps/api && npx prisma generate
RUN pnpm build --filter=api

# --- Production runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

# Copy built app from builder (skip pnpm prune — just copy what we need)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages (required for @ttndd/* imports)
COPY --from=builder /app/packages/constants ./packages/constants
COPY --from=builder /app/packages/shared ./packages/shared

# Copy API build output + prisma schema
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 8080
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
