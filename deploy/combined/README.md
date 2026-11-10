# Combined image: local verification

This image runs Caddy, Next standalone and Nest (including Socket.IO and the
existing in-process workers). Node 22 matches the repository's `.nvmrc`.
PostgreSQL, Redis and object storage must already exist outside this container.
It does not provision resources, migrate by default, or seed data.

Run from the repository root. The existing `.env.staging` uses the Docker DNS
names `postgres`, `redis`, and `minio`. These commands require the existing staging
network from the `teamhub-staging` Compose project; they do not start dependencies
or change Compose. Confirm its actual name with `docker network ls` first.

```powershell
docker build -f deploy/combined/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:10000 -t teamhub-combined:local .
docker run -d --name teamhub-combined-smoke --stop-timeout 20 --network teamhub-staging_teamhub-network --env-file .env.staging -e PORT=10000 -e FRONTEND_URL=http://localhost:10000 -p 10000:10000 teamhub-combined:local
docker logs teamhub-combined-smoke
curl.exe -i http://localhost:10000/
curl.exe -i http://localhost:10000/api/health/live
curl.exe -i http://localhost:10000/api/health/ready
curl.exe -i http://localhost:10000/healthz
curl.exe -i -H "Accept-Encoding: gzip" "http://localhost:10000/socket.io/?EIO=4&transport=polling"
docker stop --time 20 teamhub-combined-smoke
docker inspect --format '{{.State.ExitCode}} {{.State.OOMKilled}}' teamhub-combined-smoke
docker logs --tail 40 teamhub-combined-smoke
docker rm teamhub-combined-smoke
```

Expected: UI 200 (or its intended redirect), health 200, Engine.IO 200 with an
opening `0{"sid":...}` packet and no `Content-Encoding: gzip`. Stop must log
signal forwarding and all children stopped, exit 0, OOMKilled=false. The 10-second
supervisor grace period fits within the 20-second Docker stop timeout. To check
fail-fast behavior before stopping, send SIGTERM to a required child:

```powershell
docker exec teamhub-combined-smoke sh -c 'kill -TERM $(pidof caddy)'
docker wait teamhub-combined-smoke
```

Expected: container exits nonzero and stops Nest and Next too. Start a fresh
container with the same run command for the normal-stop check.

For Render, build with `NEXT_PUBLIC_SITE_URL=https://<service>.onrender.com`,
leave `NEXT_PUBLIC_API_URL` empty, supply external dependency URLs and credentials,
set `FRONTEND_URL` (or let `RENDER_EXTERNAL_URL` supply it), `TRUST_PROXY=true`
and `COOKIE_SECURE=true`. The local staging env intentionally uses HTTP cookies.
Render supplies `PORT`; only Caddy's port is public. Internal defaults are 3200
and 3000 (`PORT_API` / `PORT_WEB`). Keep all three ports distinct.

Caddy trusts the upstream ingress to preserve `X-Forwarded-Proto: https` and
the forwarded host/IP. This assumes Render is the only public ingress; do not
expose Nest or Next directly. Requests without forwarded headers use the local
HTTP scheme. `/api/*` strips `/api`; `/socket.io*` retains its path and has no
compression handler. `/healthz` rewrites to Nest `/health/live`.

Isolated supervision checks (no database, Docker, or full test suite):

```powershell
node --check deploy/combined/supervise.mjs
node --experimental-vm-modules --test deploy/combined/supervise.test.mjs
```

These mocked lifecycle checks do not prove image build, Linux signal delivery,
HTTP routing, or external dependency connectivity. Those require the Docker
smoke above. Successful container smoke only validates the combined image step,
not the whole cloud integration.
