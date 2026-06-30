# syntax=docker/dockerfile:1

# ---------- Stage 1: build (devDeps + compilación TS) ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Toolchain para módulos nativos (bcrypt)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Stage 2: dependencias de producción ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
# El entry real es dist/src/main.js (no dist/main.js)
CMD ["node", "dist/src/main.js"]
