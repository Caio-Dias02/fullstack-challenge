# Build stage
FROM node:22-alpine as builder
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy all source files except node_modules and dist
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build application
RUN pnpm --filter @fullstack-challenge/web run build

# Runtime stage - using nginx
FROM nginx:alpine as production
WORKDIR /usr/share/nginx/html

# Copy nginx config
COPY --from=builder /usr/src/app/apps/web/nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /usr/src/app/dist/apps/web /usr/share/nginx/html

# Expose port
EXPOSE 5173

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Development stage
FROM node:22-alpine as development
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy all source files except node_modules and dist
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Expose port
EXPOSE 5173

# Start dev server
CMD ["pnpm", "--filter", "@fullstack-challenge/web", "run", "dev", "--host", "0.0.0.0"]
