FROM node:24 AS base

WORKDIR /usr/src/app

# Copy workspace files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY packages/ ./packages/

# Install pnpm and nestjs-cli
RUN npm install -g pnpm

# Install dependencies recursively with all dependencies
RUN pnpm install --prod=false -r

# Development stage
FROM base AS development
COPY apps/ ./apps/
WORKDIR /usr/src/app
RUN pnpm install --prod=false -r || true
WORKDIR /usr/src/app/apps/api-gateway
EXPOSE 3000
CMD ["sh", "-c", "pnpm install --prod=false -r 2>/dev/null || true && pnpm run dev"]

# Production stage
FROM base AS production
COPY apps/api-gateway/ ./apps/api-gateway/
WORKDIR /usr/src/app/apps/api-gateway
RUN npm run build
EXPOSE 3000
CMD ["node", "start.js"]
