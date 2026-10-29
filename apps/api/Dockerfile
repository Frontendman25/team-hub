# Build from the repository root:
#   docker build -f apps/api/Dockerfile --target production -t teamhub-api:local .
#   docker build -f apps/api/Dockerfile --target migrate -t teamhub-migrate:local .
#
# Workspace install needs the root lockfile. Secrets must be supplied at runtime.

FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api

WORKDIR /repo/apps/api
RUN npm run build

FROM node:22-alpine AS development
WORKDIR /repo/apps/api

ENV NODE_ENV=development

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache ca-certificates

COPY --from=deps /repo/node_modules /repo/node_modules
COPY --from=deps /repo/apps/api/node_modules ./node_modules
COPY apps/api ./

RUN chown -R appuser:appgroup /repo

USER appuser
EXPOSE 3200

CMD ["npm", "run", "start:dev"]

FROM node:22-alpine AS production
WORKDIR /repo

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && apk add --no-cache ca-certificates

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

WORKDIR /repo/apps/api
COPY --from=builder --chown=appuser:appgroup /repo/apps/api/dist ./dist
COPY --from=builder --chown=appuser:appgroup /repo/apps/api/src/infrastructure/database/migrations ./dist/infrastructure/database/migrations

USER appuser
EXPOSE 3200
STOPSIGNAL SIGTERM

CMD ["node", "dist/main.js"]

FROM production AS migrate
WORKDIR /repo/apps/api
USER appuser
CMD ["node", "dist/migrate.js"]
