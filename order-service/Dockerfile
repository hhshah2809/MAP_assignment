# ==========================================
# Multi-stage Dockerfile for Order Service
# ==========================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/

RUN npm run build

# Stage 2: Production runner stage
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3001

# Install dumb-init or use node directly with non-root user
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled files and migrations/scripts
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/migrations ./migrations
COPY --from=builder /usr/src/app/scripts ./scripts

# Use unprivileged user
USER node

EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
