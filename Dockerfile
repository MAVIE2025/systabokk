# --- Dépendances (vendor/ contient le remplaçant vide de sharp, voir package.json > overrides)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci

# --- Build (sert aussi pour les migrations : il contient drizzle-kit)
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
RUN npm run build

# --- Image finale, légère, sans les outils de build
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
