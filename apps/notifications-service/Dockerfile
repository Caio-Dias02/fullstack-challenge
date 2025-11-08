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
COPY apps/notifications-service/ ./apps/notifications-service/
WORKDIR /usr/src/app
RUN pnpm install --prod=false -r
WORKDIR /usr/src/app/apps/notifications-service
EXPOSE 3003
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
COPY apps/notifications-service/ ./apps/notifications-service/
WORKDIR /usr/src/app/apps/notifications-service
RUN npm run build
EXPOSE 3003
CMD ["node", "start.js"]
