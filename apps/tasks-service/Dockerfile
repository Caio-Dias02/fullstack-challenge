FROM node:24 AS base

WORKDIR /usr/src/app

# Copy workspace files first
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Install pnpm and nestjs-cli
RUN npm install -g pnpm @nestjs/cli

# Install dependencies recursively
RUN pnpm install -r

# Development stage
FROM base AS development
COPY apps/ ./apps/
WORKDIR /usr/src/app
WORKDIR /usr/src/app/apps/tasks-service
EXPOSE 3002
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
COPY apps/tasks-service/ ./apps/tasks-service/
WORKDIR /usr/src/app/apps/tasks-service
RUN npm run build
EXPOSE 3002
CMD ["node", "start.js"]
