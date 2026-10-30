# Approach A — remote VM staging runbook

One public HTTPS origin. Caddy terminates TLS and routes:

- pages → Next.js
- `/api/*` → Nest (prefix stripped)
- `/socket.io*` → Nest (Engine.IO for namespace `/realtime`; **do not gzip this path**)

Do **not** put the UI on Vercel or split `app.` / `api.` hostnames. That breaks host-only `th.sid` and Socket.IO.

This is **staging**, not production. No AWS/Vercel click-deploy.

## Prerequisites

- A Linux VM you already control (Docker Engine + Compose v2).
- DNS A (and AAAA if used) for the public hostname pointing at that VM.
- Inbound **80** and **443** (and **9002** if browsers upload via published MinIO).
- Git clone of this repo. Node 22 is only required on the VM if you build outside Docker; Compose builds images itself.
- A copy of `.env.staging` on the VM. Never commit it.

Postgres and Redis stay on the Compose network (not published).

## Files

| File | Role |
| --- | --- |
| `docker-compose.yml` | Postgres, Redis, MinIO (pinned Chainguard digest) |
| `docker-compose.staging.yml` | migrate, api, web, caddy `:8080` (local) / overlay TLS |
| `docker-compose.staging.tls.yml` | host **80/443**, Caddy cert volume |
| `deploy/caddy/Caddyfile` | local HTTP (`:80` in the container) |
| `deploy/caddy/Caddyfile.tls.example` | copy over `Caddyfile` on the VM; replace the hostname |
| `.env.staging.example` | names only; copy to `.env.staging` |

Project name: `teamhub-staging` (isolated volumes). Do not `down -v` against the **dev** project (`teamhub_*` volumes).

## Secrets (names only)

Copy `.env.staging.example` → `.env.staging`. Generate new values on the VM (`openssl rand -base64 24` or equivalent). Do not reuse local `change-me-*` strings.

| Name | Notes |
| --- | --- |
| `POSTGRES_PASSWORD` | required; also embed in `POSTGRESQL_URL` |
| `POSTGRESQL_URL` | host `postgres`, db `teamhub_staging` |
| `REDIS_PASSWORD` | required; also embed in `REDIS_URL` (`redis://:PASSWORD@redis:6379`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | MinIO root; secret ≥ 8 chars |
| `FRONTEND_URL` | `https://<hostname>` (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | same as `FRONTEND_URL` |
| `NEXT_PUBLIC_API_URL` | **empty** (same-origin sockets) |
| `COOKIE_SECURE` | `true` on HTTPS |
| `COOKIE_DOMAIN` | leave empty (host-only cookie) |
| `ALLOW_DEMO_PERSONA_LOGIN` | `false` |
| `S3_ENDPOINT` | `http://minio:9000` (docker DNS) |
| `S3_PUBLIC_ENDPOINT` | URL the **browser** uses for presigned PUT (see below) |
| `TRUST_PROXY` | `true` behind Caddy |
| `SOCKET_IO_REDIS_REQUIRED` | `true` |
| `RUN_BACKGROUND_JOBS` | `true` |

Rebuild **web** after changing `NEXT_PUBLIC_*` (build-time).

`S3_PUBLIC_ENDPOINT`: locally `http://localhost:9002`. On a VM, the browser must reach MinIO (Compose publishes `${STAGING_S3_PORT:-9002}`). Set this to `https://<hostname>:9002` only if that port is reachable; otherwise keep a hostname you actually expose. CORS is `FRONTEND_URL`.

## Local HTTP (already verified)

```bash
docker compose --env-file .env.staging -p teamhub-staging \
  -f docker-compose.yml -f docker-compose.staging.yml up --build -d
```

Wait until `migrate` has **Exited 0**. Then:

```bash
curl -fsS http://localhost:8080/api/health/live
curl -fsS http://localhost:8080/api/health/ready
```

Optional catalog (not a migration, not persona passwords):

```bash
docker compose --env-file .env.staging -p teamhub-staging \
  -f docker-compose.yml -f docker-compose.staging.yml \
  run --rm --no-deps --entrypoint node api dist/seed-staging-demo.js
```

## Public HTTPS on a VM

1. Point DNS at the VM.
2. On the VM: `cp deploy/caddy/Caddyfile.tls.example deploy/caddy/Caddyfile` and replace `staging.example.com`.
3. Set `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `COOKIE_SECURE=true`, and `S3_PUBLIC_ENDPOINT` in `.env.staging`.
4. Start with the TLS overlay (does not replace Approach A routing):

```bash
docker compose --env-file .env.staging -p teamhub-staging \
  -f docker-compose.yml -f docker-compose.staging.yml -f docker-compose.staging.tls.yml \
  up --build -d
```

5. Confirm migrate **Exited 0**, then `https://<hostname>/api/health/live` and `/api/health/ready`.
6. Browser: login `Set-Cookie` is `HttpOnly; Path=/; SameSite=Lax; Secure` with **no** `Domain`. Messenger should show **Live**. Optional: run `seed-staging-demo` as above.

Caddy stores ACME material in volume `teamhub-staging_caddy_data`.

## Health, logs, update, rollback

```bash
docker compose -p teamhub-staging ps -a
docker compose -p teamhub-staging logs -f api web caddy migrate
```

Update: `git pull`, then the same `up --build -d`. Images are tagged `teamhub-api:local` / `teamhub-web:local` (last successful build). Rollback: `git checkout <sha>`, `up --build -d`. Do not `down -v` unless you intend to wipe **staging** volumes (`teamhub-staging_postgres_data`, `redis_data`, `minio_data`, `caddy_data`).

Never run `npm run db:seed` (persona passwords) against staging.

## Smoke (after HTTPS)

- Login, cookie flags, Try Demo (after catalog init)
- Chat **Live**; two **browser profiles** if you can (not only two socket clients)
- Kanban, upload (presigned PUT to `S3_PUBLIC_ENDPOINT`), Range playback
- MediaRecorder still needs a real mic/camera grant
