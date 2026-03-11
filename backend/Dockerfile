# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace root files for monorepo install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json files for all workspace packages
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile --filter backend --filter @journey-os/shared-types

# Copy source
COPY packages/shared-types/ ./packages/shared-types/
COPY backend/ ./backend/

# Build shared-types first, then backend
RUN pnpm --filter @journey-os/shared-types build
RUN pnpm --filter backend build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install production deps only
RUN pnpm install --frozen-lockfile --filter backend --filter @journey-os/shared-types --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Copy prompt files (loaded at runtime via readFileSync)
COPY --from=builder /app/backend/src/pipeline/prompts ./backend/dist/pipeline/prompts

# Runtime config
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/backend
CMD ["node", "dist/index.js"]
