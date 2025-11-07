FROM node:24 AS base

WORKDIR /usr/src/app

# Copy workspace files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Install pnpm and nestjs-cli
RUN npm install -g pnpm @nestjs/cli

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY apps/api-gateway/ ./apps/api-gateway/
WORKDIR /usr/src/app
RUN pnpm install --no-frozen-lockfile
WORKDIR /usr/src/app/apps/api-gateway
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
COPY apps/api-gateway/ ./apps/api-gateway/
WORKDIR /usr/src/app/apps/api-gateway
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/main.js"]
