# -------- Base --------
# AdonisJS 7 + @poppinss/ts-exec exigent Node >= 24
FROM node:24-alpine AS base

# better-sqlite3 (dépendance native) a besoin de ces outils au build npm
RUN apk add --no-cache python3 make g++

# -------- Dependencies (all, pour compiler) --------
FROM base AS deps
WORKDIR /app
# Forcer development : Dokploy injecte souvent NODE_ENV=production au build
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

# -------- Build --------
FROM base AS build
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build --ignore-ts-errors

# -------- Production deps --------
FROM base AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# -------- Runtime --------
FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p \
    storage/uploads/vehicles \
    storage/uploads/logos \
    storage/uploads/banners \
    storage/uploads/licenses \
    tmp

# Monter ce chemin en volume persistant (Dokploy / compose).
VOLUME ["/app/storage/uploads"]

EXPOSE 3333

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
