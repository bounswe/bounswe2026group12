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

# 7. Seed the DB (one-time — see "Seeding" below). On a brand-new box:
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend sh -c 'for c in seed_canonical seed_region_geodata seed_region_geo \
    seed_story_coordinates seed_cultural_facts seed_cultural_content \
    seed_ingredient_densities seed_ingredient_routes; do python manage.py "$c"; done'
```

`db`, `backend`, and `web` should all report `(healthy)`. The backend
entrypoint runs `migrate` and `collectstatic` before gunicorn starts; that's
covered by the backend healthcheck's 40s `start_period`. Seeding is **not**
done by the entrypoint or the deploy — it's the separate step above (and the
"Seed database" workflow), run once after first bring-up.

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

## Seeding

Seeding is a deliberate, occasional operation — **not** part of the deploy.
`seed_canonical` *wipes and rebuilds* users / recipes / stories / heritage /
cultural content, so running it on every deploy would destroy anything created
on prod since the last deploy and (because `web` waits on `backend` being
healthy) take the site down for the duration. Run seeding once after first
bring-up, and again only when seed fixtures or commands change — in that case
deploy first (so the rebuilt backend image carries the new fixtures), then
seed.

The commands, in dependency order:

```
seed_canonical            # base data: regions, ingredients, recipes, stories,
                          #   heritage groups, cultural content/events, …
                          #   (DESTRUCTIVE — wipes & rebuilds the above)
seed_region_geodata       # built-in geo coords for known regions
seed_region_geo           # region bbox + per-recipe map coords (fixture)
seed_story_coordinates    # per-story map pins (needs region bbox)
seed_cultural_facts       # region-tied "Did You Know?" facts
seed_cultural_content     # culture cards
seed_ingredient_densities # g/ml for unit conversions
seed_ingredient_routes    # ingredient migration map overlays
```

Everything except `seed_canonical` is an idempotent upsert (keyed on natural
keys) — safe to rerun. `seed_test_db` is **not** in this list: it's a
mock-data seeder for throwaway test DBs, not for prod.

Two ways to run it:

1. **"Seed database" GitHub Action** (`.github/workflows/seed-db.yml`) —
   `workflow_dispatch`. Pick `mode=safe` (everything except `seed_canonical`)
   or `mode=full` (includes the destructive `seed_canonical`; requires
   `confirm=yes`).
2. **Directly on the box** (take a DB dump first — see `ops/ROLLBACK.md`):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
     exec backend sh -c 'for c in seed_canonical seed_region_geodata seed_region_geo \
       seed_story_coordinates seed_cultural_facts seed_cultural_content \
       seed_ingredient_densities seed_ingredient_routes; do python manage.py "$c"; done'
   ```

## Rollback

Three rollback paths (quick reset to a previous good commit, full revert to
the legacy systemd stack during the post-cutover window, database restore
from a SQL dump) are documented in `ops/ROLLBACK.md`. Start there when a
deploy breaks prod. The named volume `bounswe2026group12_pgdata` survives
`compose down`; only `compose down -v` destroys data, so do not run that.

## Healthchecks

All three services report container-level health to compose:

- `db`: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`, 10s interval
- `backend`: Python `urllib.request.urlopen("http://localhost:8000/admin/login/")` —
  the admin login page renders without a DB query, so this is a clean
  liveness probe for gunicorn. 15s interval, 40s `start_period` to cover
  migrate + collectstatic (gunicorn starts after the entrypoint finishes them).
- `web`: in prod, `wget --no-check-certificate https://127.0.0.1/` (overridden
  in `docker-compose.prod.yml`); the base/dev healthcheck uses plain HTTP, but
  `nginx-prod.conf` only listens on `0.0.0.0` and `:80` redirects to https, so
  the prod check hits https on loopback. 10s interval.

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
