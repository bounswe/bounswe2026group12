# Production bring-up — `docker compose -f docker-compose.yml -f docker-compose.prod.yml`

End-to-end runbook for standing up the genipe.app stack on a clean Ubuntu box.
The deploy GitHub Action (`.github/workflows/deploy-web.yml`) automates the
update path on every push to `main`; this doc covers first-time setup, env
audit, manual updates, and rollback. Server-specific notes (current Vultr box
IP, legacy systemd state pre-cutover) live in `sunucu_ayarlari.md` at the
repo root and on the server itself; this file does not duplicate them.

## Prerequisites

- Ubuntu 22.04+ box with root SSH and a public IPv4
- Domain pointing at the box (A record + AAAA if IPv6)
- Docker Engine 24+ and the Compose v2 plugin (`docker compose`, not the
  legacy `docker-compose`)
- A Let's Encrypt certificate at `/etc/letsencrypt/live/<domain>/` (the prod
  overlay mounts `/etc/letsencrypt` read-only into the `web` container; nginx
  inside the container reads `fullchain.pem` and `privkey.pem` from there)

## First-time setup

```bash
# 1. Install Docker + compose plugin (skip if already present)
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# 2. Clone the repo
mkdir -p /root && cd /root
git clone https://github.com/bounswe/bounswe2026group12.git
cd bounswe2026group12

# 3. Create the root-level .env
cp .env.example .env
$EDITOR .env  # fill SECRET_KEY, POSTGRES_PASSWORD, ALLOWED_HOSTS,
              # CORS_ALLOWED_ORIGINS, REACT_APP_API_URL

# 4. Obtain a Let's Encrypt cert (one-time; renewal is a separate ops task).
#    nginx-prod.conf expects /etc/letsencrypt/live/<domain>/{fullchain,privkey}.pem.
apt-get install -y certbot
certbot certonly --standalone -d genipe.app -d www.genipe.app

# 5. Bring the stack up
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate

# 6. Wait for healthchecks (≤60s) and smoke
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -fsS https://genipe.app/
```

`db`, `backend`, and `web` should all report `(healthy)`. The backend
entrypoint runs `migrate` and `collectstatic` automatically before gunicorn
starts; that's covered by the backend healthcheck's 40s `start_period`.

## Required environment variables

Audited against `app/backend/config/settings.py`. Every `os.getenv` /
`os.environ.get` call is listed. Defaults shown are the ones in
`docker-compose.yml`; .env values override them.

| Key | Required | Compose default | Notes |
|---|---|---|---|
| `SECRET_KEY` | Yes (prod) | dev placeholder | Override with a long random string in prod |
| `DEBUG` | Yes | `False` | Must be `False` in prod; flips CORS to allow-all when `True` |
| `ALLOWED_HOSTS` | Yes | `localhost,127.0.0.1,backend` | Comma-separated; include the public domain in prod |
| `CORS_ALLOWED_ORIGINS` | Yes (prod) | `https://genipe.app,https://www.genipe.app` | Only consulted when `DEBUG=False` |
| `POSTGRES_DB` | Yes | `bounswe_db` | |
| `POSTGRES_USER` | Yes | `genipe` | |
| `POSTGRES_PASSWORD` | Yes (prod) | `genipe_mvp_2026` | Override with a strong secret |
| `POSTGRES_HOST` | Yes | `db` (compose service name) | Hardcoded in compose; only override outside compose |
| `POSTGRES_PORT` | Yes | `5432` | Hardcoded in compose |
| `REACT_APP_API_URL` | Yes (build-time) | `http://localhost` | Baked into the `web` image; set before `compose build` |
| `AWS_STORAGE_BUCKET_NAME` | No | empty | When set, switches `DEFAULT_FILE_STORAGE` to S3Boto3Storage; otherwise the local `media_data` volume is used |
| `AWS_S3_ENDPOINT_URL` | If S3 | empty | Required when bucket name is set |
| `AWS_ACCESS_KEY_ID` | If S3 | empty | Required when bucket name is set |
| `AWS_SECRET_ACCESS_KEY` | If S3 | empty | Required when bucket name is set |
| `AWS_S3_REGION_NAME` | If S3 | `ewr1` | Vultr's New Jersey region |

`POSTGRES_HOST` falls back to SQLite when unset (dev/test). The compose
backend service always has it set to `db`, so prod always uses Postgres.

## Update procedure

`deploy-web.yml` runs this on every push to `main`. To replicate manually:

```bash
ssh root@<server>
cd /root/bounswe2026group12
git fetch origin && git reset --hard origin/main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
sleep 15
curl -fsS https://genipe.app/
```

`--force-recreate` matters: when the prod overlay adds ports or volume mounts
that compose's normal diff misses on already-running containers, plain `up -d`
silently keeps the stale container. The deploy workflow learned this the hard
way during the #476 outage.

If the smoke fails, dump logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 backend web db
```

## Rollback

Two layers of rollback are available.

1. **Within compose**: redeploy the previous commit.
   ```bash
   git reset --hard <prev-sha>
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
   ```

2. **Out of compose, back to legacy systemd + standalone Postgres** — kept
   warm for one week post-cutover. The exact commands and the legacy
   `genipe-db` container details are in `sunucu_ayarlari.md` (server-side
   copy at `/root/bounswe2026group12/sunucu_ayarlari.md`).

The `pgdata` volume is named (`bounswe2026group12_pgdata`) and survives
`compose down`. Only `compose down -v` would destroy data; do not run that.

## Healthchecks

All three services report container-level health to compose:

- `db`: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`, 10s interval
- `backend`: Python `urllib.request.urlopen("http://localhost:8000/admin/login/")` —
  the admin login page renders without a DB query, so this is a clean
  liveness probe for gunicorn. 15s interval, 40s `start_period` to cover
  migrate + collectstatic.
- `web`: `wget -qO- http://localhost/`, 10s interval

`backend` waits on `db: service_healthy`; `web` waits on `backend:
service_healthy`. Compose will not mark the stack up until each dependency
reports healthy, so the deploy workflow's `curl https://...` smoke test only
runs against a stack that has already passed container-level checks.

## Validation

This is a config-only change. To validate locally without bringing the stack
up:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config > /tmp/merged.yml
```

A clean exit code means the merged config parses. The deploy workflow
exercises the rest end-to-end on the next push to `main`.
