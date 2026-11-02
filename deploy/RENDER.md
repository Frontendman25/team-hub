# Render Free combined demo (not production)

One public HTTPS origin. Render terminates TLS. The combined image runs Caddy + Next + Nest (Socket.IO and in-process BullMQ workers) in **one** Free web service.

Local Docker/Caddy/MinIO is unchanged (`docker-compose.yml` + `docker-compose.staging.yml`).

Do **not** add a payment method. Do **not** use keep-alive pings. Render Key Value is **not** durable job storage.

## Account settings you must do

Documented Free eligibility (no card). Remaining quotas are **account-specific** and not guaranteed.

### 1. Neon Free

1. Create a project (no card).
2. Copy the pooled or direct `POSTGRESQL_URL` (sslmode=require).
3. After the web service exists, allow the Render outbound IPs if you enable IP allow-lists (default Neon Free does not require this).

Limits (docs): 1 GB storage, 100 CU-hours/project/month, scale-to-zero after 5 minutes, 5 GB transfer.

### 2. Render Key Value Free

1. New → Key Value → **Free**.
2. Enable **external connections** only if you debug from a laptop. The web service should use the **internal** `REDIS_URL`.
3. Treat flushes/restarts as total queue loss. Nest re-adds the 15-minute demo cleanup schedule and re-queues **pending invitations that still have a registered recipient and no invitation notification**. Unread cache, presence, and in-flight jobs that exist only in Redis are gone.

Limits (docs): 25 MB, 50 connections, **no persistence**.

### 3. Cloudinary Free

1. Sign up (no card). Copy **cloud name**, **API key**, **API secret**.
2. Security settings:
   - Enable **Allow delivery of PDF and ZIP files** if you need PDF playback/download (blocked on Free by default).
3. Do **not** use unsigned upload presets or public `upload` delivery. TeamHub uploads `type=authenticated` and **never** returns Cloudinary URLs to the browser. Signed delivery URLs **do not expire**; access is session-gated via Nest `GET /files/:id/content`. Deleting the file in TeamHub destroys the Cloudinary asset.

Credits (docs): 25 credits / rolling 30 days (storage + bandwidth + transformations).

### 4. Render Free web service

1. New → Web Service → this Git repo.
2. **Docker**. Dockerfile path: `deploy/combined/Dockerfile`.
3. Instance: **Free**. Docker build ARG `NEXT_PUBLIC_SITE_URL=https://<service>.onrender.com` (must be a valid URL; empty string fails `metadataBase`). `NEXT_PUBLIC_API_URL` stays empty.
4. Health check: `/api/health/live` (or `/healthz`).
5. Use the `onrender.com` hostname. No custom domain required.

Set `FRONTEND_URL` to `https://<service>.onrender.com` after the first hostname exists. `RENDER_EXTERNAL_URL` is applied automatically if `FRONTEND_URL` is empty.

`RUN_MIGRATE_ON_BOOT=true` on the first deploy (Free has no one-off jobs). Then set it back to `false` so every restart does not race migrations.

Optional catalog (idempotent, not persona passwords): after migrate, run locally against Neon:

```bash
POSTGRESQL_URL="postgresql://..." npm run db:seed:staging-demo
```

Or temporarily `RUN_DEMO_SEED_ON_BOOT` is **not** implemented in the image; use the npm command.

## Environment variables (names only)

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://<service>.onrender.com` |
| `NEXT_PUBLIC_API_URL` | empty (build ARG default) |
| `NEXT_PUBLIC_SITE_URL` | same as `FRONTEND_URL` (build ARG; optional) |
| `POSTGRESQL_URL` | Neon URL |
| `REDIS_URL` | Render Key Value internal URL |
| `COOKIE_SECURE` | `true` |
| `COOKIE_DOMAIN` | empty (host-only) |
| `TRUST_PROXY` | `true` (default in the supervisor) |
| `SOCKET_IO_REDIS_REQUIRED` | `true` |
| `RUN_BACKGROUND_JOBS` | `true` |
| `ALLOW_DEMO_PERSONA_LOGIN` | `false` |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `RUN_MIGRATE_ON_BOOT` | `true` once, then `false` |
| `PORT` | set by Render |

Never commit these values. Do not log secrets.

## Limitations (accepted)

- Sleep after ~15 minutes idle; ~1 minute cold start.
- In-process workers (invite notify, guest cleanup) pause while slept.
- 0.1 CPU / 512 MB.
- Redis restarts wipe queues/cache/presence.
- Neon compute sleeps after 5 minutes idle.

## Local combined image (512 MB check)

```bash
docker build -f deploy/combined/Dockerfile -t teamhub-combined:local .
docker run --rm --memory=512m --memory-swap=512m -p 10000:10000 \
  --env-file .env.combined.local teamhub-combined:local
```

`.env.combined.local` is gitignored via `.env.*`. Point `POSTGRESQL_URL` / `REDIS_URL` at the existing **local** staging compose network, not at Render, when verifying RAM.

### Measured 512 MB cap (local combined image, Oct 2026)

Workload against staging Postgres/Redis/MinIO (`STORAGE_DRIVER=s3`, `COOKIE_SECURE=false`), `docker run --memory=512m --memory-swap=512m`. Figures are `docker stats` RSS, not idle-only:

| Workload | RSS |
| --- | --- |
| Startup, `/api/health/live` 200 | ~118 MiB |
| Home + login pages | ~132–136 MiB |
| Register + login (argon2) | ~136 MiB |
| Guest demo + JPEG + 5 MiB audio/webm proxy PUT + Range 206 | ~146 MiB |
| PDF, TXT, DOCX, MP4 upload/download/Range + 6 Engine.IO polls + `/users/me` | **peak 148.7 MiB / 512 MiB** |

Not proven: 25 MiB media through Cloudinary (Nest buffers `put()`), two real browser WebSocket chat profiles, or Render's extra overlay. Headroom exists for that demo, but a large concurrent Cloudinary proxy upload plus chat is the risk, not idle RSS.

Cloudinary signed delivery URLs are an 8-character HMAC of path+secret; they **do not expire**. Token ACL is not a Free feature. TeamHub therefore never returns `res.cloudinary.com` to the browser. Enable **Allow delivery of PDF and ZIP files** in Cloudinary Security or Nest `getStream` of PDFs fails on Free.
