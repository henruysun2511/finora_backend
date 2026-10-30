# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies + ts-node & typescript for running migrations
COPY package*.json ./
RUN npm ci --omit=dev && npm install ts-node@^10.9.2 typescript@^5.6.2 -E

# Copy build artifacts and configuration
COPY --from=builder /app/dist ./dist
COPY src/database ./src/database
COPY src/config ./src/config
COPY src/common ./src/common
COPY tsconfig*.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
