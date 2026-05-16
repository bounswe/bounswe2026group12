# genipe — Cross-Generational Recipe & Food Heritage Platform

CMPE 354 — Group 12 (Spring 2026).

genipe is a recipe and food-heritage platform that pairs traditional
recipes with the stories behind them. Authors publish recipes (video +
description + structured ingredients), tell the cultural story that
goes with them, and readers can search by region, convert units, find
ingredient substitutions, and reach the author for follow-up questions.

Live at [genipe.app](https://genipe.app).

## Documentation

| File | What's in it |
|---|---|
| [`README.md`](README.md) | You are here. |
| [`SETUP.md`](SETUP.md) | Local dev: clone-to-running for backend, web, and mobile. |
| [`RELEASE_NOTES.md`](RELEASE_NOTES.md) | What shipped in MVP (2026-04-07) and Final (2026-05-14). |
| [`ops/PROD.md`](ops/PROD.md) | Production bring-up runbook (docker compose + nginx + Let's Encrypt). |
| [`ops/ROLLBACK.md`](ops/ROLLBACK.md) | Production rollback procedure. |
| [`docs/lab9-acceptance-test-traceability.md`](docs/lab9-acceptance-test-traceability.md) | Acceptance criteria → test mapping. |
| [`docs/lab9-edit-enforcement-audit.md`](docs/lab9-edit-enforcement-audit.md) | Server-side edit enforcement audit (#360). |
| `CLAUDE.md` | Repo conventions for git, commits, PRs, and review style. |

## Tech stack

| Layer | Technology | Hosting |
|---|---|---|
| Backend | Python 3.12, Django 5.2, DRF, JWT (SimpleJWT) | Vultr VPS (docker compose) |
| Database | PostgreSQL 16 | Vultr VPS (Postgres container) |
| Web frontend | React 19 (CRA), react-leaflet | Vultr VPS (nginx container) |
| Mobile | React Native via Expo SDK 54 | Expo + signed APK |
| Object storage (optional) | S3-compatible (Vultr Object Storage) | Vultr |
| CI | GitHub Actions (tests + coverage on every PR) | github.com |
| Auto-deploy | GitHub Actions on push to `main` | Vultr VPS |

## Repository layout

```
app/
  backend/    Django project (apps/, config/, fixtures/, requirements.txt)
  frontend/   React web client
  mobile/     Expo / React Native client
docs/         Acceptance and audit docs
ops/          Production runbooks and nginx config
.github/      CI workflows (tests, deploy-web, mobile-apk)
docker-compose.yml             Dev stack (db + backend + web)
docker-compose.prod.yml        Prod overlay (HTTPS + healthchecks)
.env.example                   Compose env template
```

## Getting started

For local development, see [SETUP.md](SETUP.md).

For production deploys, see [ops/PROD.md](ops/PROD.md).

## Default credentials

Two pre-created accounts exist on the live deploy at
[https://genipe.app](https://genipe.app) (and on the production database
seeded by the `final-milestone` release). Reviewers can log in
immediately with either account on both the web app and the signed APK.

| Role | Username | Email | Password |
|---|---|---|---|
| Admin | `Cred User1` | `creduser1@gmail.com` | `creduser1` |
| Regular user | `Cred User2` | `creduser2@gmail.com` | `creduser2` |

`Cred User1` has Django-admin (`/admin/`) access in addition to the
regular app surfaces. `Cred User2` is a plain user account intended for
walking through the standard flows (browse → search → create → message →
rate → I-Tried-This → passport).

## Data seeding

The backend ships with a canonical seed catalogue covering regions,
ingredients, dietary tags, recipes, stories, cultural events, heritage
groups and the cultural-passport reward graph. Two ways to load it:

1. **Local dev (recommended for first run):**
   ```bash
   cd app/backend
   source venv/bin/activate
   python manage.py migrate
   python manage.py seed_canonical
   python manage.py seed_cultural_facts
   python manage.py seed_ingredient_routes
   python manage.py seed_region_geo
   python manage.py seed_story_coordinates
   ```
   See [SETUP.md](SETUP.md#backend-django) for the full bring-up.

2. **Production:** seeding runs automatically at container start via
   the `docker-entrypoint.sh` script. The `seed-db` GitHub Actions
   workflow can re-run it on demand without redeploying — see
   [`.github/workflows/seed-db.yml`](.github/workflows/seed-db.yml) and
   [`ops/PROD.md`](ops/PROD.md).

## Team

| Area | Members |
|---|---|
| Frontend | Eren Can Özkaya, Mustafa Ocak, Mustafa Çağan İslam, Dağlar Tekşen |
| Backend | Ahmet Akdağ, Ufuk Altunbulak, Ahmet Ayberk Durak, Emirhan Şimşek, Uygar Apan |
| DevOps | Mustafa Ocak, Mustafa Çağan İslam, Emirhan Şimşek, Ahmet Akdağ |

Project wiki, requirements, and meeting notes live in the
[GitHub Wiki](https://github.com/bounswe/bounswe2026group12/wiki).

## Milestones

- MVP (Milestones 1–3) — 2026-04-07. Tag
  [`v1.0-mvp`](https://github.com/bounswe/bounswe2026group12/releases/tag/v1.0-mvp).
- Final (Milestones 4–6) — 2026-05-14.

Detailed change log per build is in [RELEASE_NOTES.md](RELEASE_NOTES.md).
