# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --filter=@fullstack-challenge/notifications-service

# Runtime stage
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist/apps/notifications-service ./dist

EXPOSE 3003

CMD ["node", "dist/main.js"]
