# Combined demo image: Caddy + Next standalone + Nest (Socket.IO + in-process workers).
# Render terminates TLS. Caddy listens on $PORT (default 10000).
#
#   docker build -f deploy/combined/Dockerfile -t teamhub-combined:local .

FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:22-alpine AS api-builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
WORKDIR /repo/apps/api
RUN npm run build

FROM node:22-alpine AS web-builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_SITE_URL=http://localhost:10000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo/apps/web
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV PORT_API=3200
ENV PORT_WEB=3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && apk add --no-cache ca-certificates

COPY --from=caddy:2.9-alpine /usr/bin/caddy /usr/bin/caddy
# Caddy's upstream binary can carry cap_net_bind_service=+ep. Render supplies
# an unprivileged PORT; exec of a capability-bearing file may fail with EPERM
# under a restricted capability bounding set. Copy bytes to a fresh inode so
# security.capability is not carried into runtime (no extra packages required).
RUN cat /usr/bin/caddy > /usr/bin/caddy.unprivileged \
  && chmod 0755 /usr/bin/caddy.unprivileged \
  && mv /usr/bin/caddy.unprivileged /usr/bin/caddy

COPY --from=prod-deps --chown=appuser:appgroup /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appgroup /repo/package.json ./package.json
COPY --from=api-builder --chown=appuser:appgroup /repo/apps/api/dist ./apps/api/dist
COPY --from=api-builder --chown=appuser:appgroup /repo/apps/api/src/infrastructure/database/migrations ./apps/api/dist/infrastructure/database/migrations
COPY --from=web-builder --chown=appuser:appgroup /repo/apps/web/.next/standalone ./web
COPY --from=web-builder --chown=appuser:appgroup /repo/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=web-builder --chown=appuser:appgroup /repo/apps/web/public ./web/apps/web/public
COPY --chown=appuser:appgroup deploy/combined/Caddyfile /app/Caddyfile
COPY --chown=appuser:appgroup deploy/combined/supervise.mjs /app/supervise.mjs

USER appuser
RUN /usr/bin/caddy version
EXPOSE 10000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "/app/supervise.mjs"]
