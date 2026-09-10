# -------- Base --------
FROM node:20-alpine AS base

# better-sqlite3 (dépendance native) a besoin de ces outils au build npm
RUN apk add --no-cache python3 make g++

# -------- Dependencies (all, pour compiler) --------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -------- Build --------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build

# -------- Production deps --------
FROM base AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# -------- Runtime --------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./

# Dossier uploads (à monter en volume persistant sur Dokploy)
RUN mkdir -p storage/uploads tmp

EXPOSE 3333

CMD ["node", "bin/server.js"]
