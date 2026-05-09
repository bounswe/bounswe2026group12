# MVP build notes

This file records the MVP commit and the artifact preservation done in #395 (TD-04).

## MVP commit

- Tag: `v1.0-mvp` (annotated)
- Commit SHA: `e5006be473377ac275476edfdda111c5510d0113`
- Short SHA: `e5006be`
- Author date: 2026-04-07 23:55:13 +0300
- Subject: Merge pull request #304 from bounswe/fix/frontend/recipe-list-region-name-294

This is the latest commit on `main` whose author timestamp falls on or before
2026-04-07 23:59:59 +0300, the MVP demo deadline. It is reachable from `origin/main`
(verified with `git merge-base --is-ancestor`).

## Why this commit

- The MVP demo was on 2026-04-07 (per `CLAUDE.md` milestone). Our cutoff is the end
  of that calendar day in Istanbul time (+03:00).
- All commits between 2026-04-06 and 2026-04-07 23:59 were either MVP-feature work
  (auth, recipe CRUD, search, stories, ingredient/unit DB and submission, mobile
  parity, deploy workflow) or last-minute pre-demo polish (region name on recipe
  list cards, region dropdown, recipe author display, image rendering, error
  message UX, mobile API connection to genipe.app).
- The first commit dated 2026-04-08 is `533dff3` (PR #323 frontend story-edit
  author check, 2026-04-08 14:39 +0300). That landed the day after the demo and is
  treated here as post-MVP, so it is NOT part of the tag.
- Tag is annotated so the requirement-coverage summary is carried as tag metadata.

## GitHub release

- URL: https://github.com/bounswe/bounswe2026group12/releases/tag/v1.0-mvp
- Auto-attached archives (build artifact for the issue's "archived build artifact"
  deliverable):
  - `Source code (zip)`
  - `Source code (tar.gz)`

The source archive at `e5006be` IS the artifact. No binaries are attached because
the deployed frontend is served by Vercel and the backend runs from source on the
Vultr VPS, so a source snapshot at this commit reproduces the deployed build.

## Test baseline

The MVP test count cited in the Lab 9 report is 104 unit + integration tests across
backend (`apps.users`, `apps.recipes`, `apps.stories`, `apps.search`) and frontend
(React component + service tests under `app/frontend/src/__tests__/`). To reproduce
the baseline at the tag:

```
git checkout v1.0-mvp
cd app/backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py test
```

```
cd app/frontend && npm ci && npm test -- --watchAll=false
```

## Requirement coverage at MVP

- Guest browsing: req 3.0.1, 3.1.4
- Registration / login / JWT auth: req 3.0.2, 3.1.1-3.1.3
- Recipe CRUD + publishing: req 3.2.1-3.2.11
- Predefined Ingredient + Unit DB + user submission: req 3.7.1-3.7.6
- Search + region filter: req 3.3.1-3.3.9
- Stories with linked recipes: req 3.5.1-3.5.6

## Reproducing the build

```
git checkout v1.0-mvp
cd app/backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver
# in another shell:
cd app/frontend && npm ci && npm start
```

`ops/PROD.md` and the docker-compose production stack post-date the MVP cutover;
the MVP build itself ran on legacy systemd on the Vultr VPS. Reproducing the MVP
data set is out of scope here (DB rows have evolved since 2026-04-07).

## Final tag (post-Final demo)

The Final demo is 2026-05-14. A separate PR will cut `v1.0-final` (or similar)
the same way after that demo. This PR does NOT pre-cut the Final tag.
