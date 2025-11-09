FROM node:24 AS base

WORKDIR /usr/src/app

# Copy workspace files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY packages/ ./packages/

# Install pnpm and nestjs-cli
RUN npm install -g pnpm

# Install dependencies recursively
RUN pnpm install --prod=false -r

# Development stage
FROM base AS development
COPY apps/ ./apps/
WORKDIR /usr/src/app
RUN pnpm install --prod=false -r || true
WORKDIR /usr/src/app/apps/auth-service
EXPOSE 3001
CMD ["sh", "-c", "pnpm install --prod=false -r 2>/dev/null || true && pnpm run dev"]

# Production stage
FROM base AS production
COPY apps/auth-service/ ./apps/auth-service/
WORKDIR /usr/src/app/apps/auth-service
RUN npm run build
EXPOSE 3001
CMD ["node", "start.js"]
