# Build from the repository root:
#   docker build -f apps/web/Dockerfile --target production -t teamhub-web:local .
#
# NEXT_PUBLIC_* values are inlined at build time. For same-origin staging
# (Caddy routing /api and /socket.io), leave NEXT_PUBLIC_API_URL empty.

FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /repo/apps/web
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=appuser:appgroup /repo/apps/web/public ./apps/web/public

USER appuser
EXPOSE 3000
STOPSIGNAL SIGTERM

CMD ["node", "apps/web/server.js"]
