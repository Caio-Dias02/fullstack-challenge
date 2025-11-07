FROM node:24-alpine AS base

WORKDIR /app

# Copy workspace files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
RUN pnpm install
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production stage
FROM base AS production
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
RUN pnpm install
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
