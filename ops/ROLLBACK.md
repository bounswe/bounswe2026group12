# Production rollback runbook

The deploy broke prod. This file is a focused recovery guide. The
forward-deploy story lives in `ops/PROD.md`; this file is only what to do
when the latest `main` is bad and you need the site back.

Three rollback paths, in order of how often you should reach for them:

- Section A: redeploy a previous good commit on the existing compose stack.
  This is the default and covers ~all incidents.
- Section B: full revert from compose back to the legacy systemd + standalone
  Postgres stack. Reserved for the "compose itself is the problem" case
  during the post-cutover window.
- Section C: database rollback from a SQL dump. Destructive. Only when the
  schema or data is corrupt and you have a known-good dump in hand.

Server: `45.76.34.210` (genipe.app). All commands run as `root` from
`/root/bounswe2026group12` unless noted.

## Section A: Quick rollback to last known-good main

Use when a recent push to `main` broke prod and the previous commit was
healthy. The deploy workflow already runs `git reset --hard origin/main` and
`up -d --force-recreate` on every push, so this is the same path applied
manually to an older SHA.

```bash
ssh root@45.76.34.210
cd /root/bounswe2026group12

# 1. Identify the last good commit. The broken one is at HEAD; pick the SHA
#    immediately before it (or further back if multiple bad commits stacked).
git log --oneline -10

# 2. Pin the working tree to that commit. This is destructive to local
#    changes on the server; the server should have none.
git reset --hard <good-commit-sha>

# 3. Rebuild and recreate. --force-recreate is required: the prod overlay
#    adds ports/volumes that compose's diff misses on already-running
#    containers (this was the #476 outage). The post-#476/#485 deploy
#    workflow always uses --force-recreate; do the same here.
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate

# 4. Wait for healthchecks then smoke.
sleep 15
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -fsS https://genipe.app/
```

If the smoke fails, dump the last 100 log lines per service and triage
before trying Section B:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 backend web db
```

After recovery, open a fix-forward PR on the bad change so the next push to
`main` does not re-apply it.

Migrations note: a schema migration that ran on the bad commit is not
reversed by `git reset`. If the bad commit included a migration and the new
code path no longer matches the schema, Section A is not enough; either
revert the migration in the source and re-deploy, or fall through to
Section C.

## Section B: Compose stack rollback to legacy systemd

Use when the compose stack itself is the problem (image build broken,
networking misbehaving, runtime mismatch) and Section A has not helped.
Available only during the post-cutover preservation window.

The legacy `genipe-backend` systemd unit, `nginx` host service, and the
standalone `genipe-db` container with its `pgdata` volume are kept warm on
the box for one week after the compose cutover specifically so this path
remains viable. Do not delete `genipe-db`, its volume, the systemd unit
file, or the host nginx config until that window passes.

Exact commands (compose down, restart legacy `genipe-db`, re-enable systemd
units, restart nginx) are in `sunucu_ayarlari.md` under "Rollback (if
compose deployment breaks)". The server-side copy lives at
`/root/bounswe2026group12/sunucu_ayarlari.md`. That file is the source of
truth for legacy infrastructure details; this runbook does not duplicate
it so the two cannot drift.

After a Section B rollback, file an incident note so the compose stack can
be debugged offline before the next attempt; the legacy stack is a stopgap,
not the long-term shape.

## Section C: Database rollback

When NOT to use this: do not run Section C unless you have a known-good
SQL dump on disk and you have decided that the current database state is
unrecoverable. Restoring a dump on top of `bounswe_db` overwrites every
row written since the dump was taken; that data is gone. If you only need
to reverse a code change, Section A is enough. If you only need to reverse
a single migration, prefer `manage.py migrate <app> <prev_migration>` from
the running backend container over a full restore. Section C exists for
schema corruption, accidental destructive SQL, or a bad migration that
cannot be reversed in code.

```bash
ssh root@45.76.34.210
cd /root/bounswe2026group12

# 1. Stop the application services so nothing is writing while we restore.
#    Leave db running so we can dump and restore through it.
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend web

# 2. Take a fresh dump of the current (broken) state. This is the
#    "before-rollback" snapshot; without it there is no path back if the
#    chosen rollback dump turns out to be wrong.
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db \
  pg_dump -U genipe bounswe_db > /tmp/before-rollback-$(date +%s).sql

# 3. Apply the operator-chosen rollback dump. Replace the path with the
#    actual dump file. The dump must have been taken with pg_dump against
#    the same major Postgres version (16) and the same database name.
cat /path/to/known-good-dump.sql | \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  psql -U genipe -d bounswe_db

# 4. Bring the app back. --force-recreate ensures the backend reconnects
#    cleanly against the restored schema.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate

# 5. Verify.
sleep 15
curl -fsS https://genipe.app/
```

If the restore stream errors mid-way, the database is in a partial state.
Do not start `backend` against it. Restore the `before-rollback-*.sql`
snapshot from step 2 to get back to the (broken but consistent) starting
state and reassess.

The named volume `bounswe2026group12_pgdata` survives `compose down` and
`compose down --remove-orphans`. Only `compose down -v` destroys it; never
run that on prod.
