# genipe — Cross-Generational Recipe & Food Heritage Platform

CMPE 354 / 451 — Group 12 (Spring 2026).

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
