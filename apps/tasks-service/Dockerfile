# Build stage
FROM node:22-alpine as development
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy all source files except node_modules and dist
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build application
RUN pnpm --filter @fullstack-challenge/tasks-service run build

# Production stage
FROM node:22-alpine as production
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy all source files except node_modules and dist
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile && \
    rm -rf apps/*/src && \
    rm -rf .git .github

# Copy built application from builder
COPY --from=development /usr/src/app/dist ./dist

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/apps/tasks-service/src/main.js"]
