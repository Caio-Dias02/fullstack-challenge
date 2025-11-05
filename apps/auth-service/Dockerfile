# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --filter=@fullstack-challenge/auth-service

# Runtime stage
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist/apps/auth-service ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
