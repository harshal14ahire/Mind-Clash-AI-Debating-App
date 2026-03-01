# Build stage: install all dependencies and build the frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dependencies (tsx is a devDependency but required at runtime to execute server.ts)
COPY package*.json ./
RUN npm ci

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy the built frontend from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server source and TypeScript config
COPY server.ts tsconfig.json ./

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node_modules/.bin/tsx", "server.ts"]
